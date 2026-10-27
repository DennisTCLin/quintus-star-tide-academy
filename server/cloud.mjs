import { applySchoolCurriculum } from "./school-roster.mjs";
import { createAdminService } from './admin.mjs';
import { createDragonProvider } from './dragon-provider.mjs';
import { createGuideService } from './dragon-guide.mjs';
import { createCompanionVoiceProvider } from './companion-voice-provider.mjs';
import { createCompanionVoiceService } from './companion-voice.mjs';
import pg from "pg";
import { createOnlineBattleService } from "./online-battle.mjs";
import {
  randomBytes,
  randomUUID,
  randomInt,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { passwordHash, passwordMatches } from "./credentials.mjs";
import { backfillPresenceHistory, hasAdventureHistory, recordPlayerSeen } from "./presence-history.mjs";
import { readPlayerCollections } from "./player-collections.mjs";
import { ensurePlayerFriendships, connectedPlayerFriends } from "./player-friends.mjs";
import {
  ACTIVITIES,
  startIsland, answerIsland, finishIsland, quitIsland, helpIsland, publicIslandRun,
  territoryTransition,
  depositLearningMaterials,
  homeDecorTransition,
  setLearningGoal,
  newFamily,
  newOnboardingFamily,
  drawStarter,
  confirmStarter,
  validateFamily,
  PLAYERS,
  COURSES,
  taipeiDay,
  startRun,
  readyQuestion,
  setChallengeMode,
  answerRun,
  answerCapture, skipCapture, captureIndex,
  monsterById,
  claimReward,
  abandonRun,
  markRunAssisted,
  allocateBattleQuestion,
  recordBattleAnswer,
  nextQuestion,
  correctRun,
  skipRemediation,
  useSkill,
  buyPet,
  draw,
  proposeTrade,
  acceptTrade,
  petById,
  questionById,
  allocateQuestions,
  markMastered,
  startStudy, answerStudy, nextStudy, hintStudy, pauseStudy, observeStudy, studySummary,
} from "../build/game.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("hex");
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const assert = (ok, message = "操作資料不正確", status = 400) => {
  if (!ok) throw new ApiError(status, message);
};
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
function fields(value, allowed) {
  assert(object(value) && Object.keys(value).every((k) => allowed.includes(k)));
}
const uuid = (value) =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    value,
  );
const zeroScores = () => Object.fromEntries(PLAYERS.map((p) => [p.id, 0]));
function publicState(row, user, csrf) {
  const family = applySchoolCurriculum(validateFamily(row.family), user),
    questions = {}, questionAssets = {}, reviews = {}, studyQuestions = {}, studySummaries = {}, captureQuestions = {};
  for (const player of PLAYERS) {
    const p = family.profiles[player.id],
      r = p.run;
    delete p.legacyGarden;
    studySummaries[player.id] = studySummary(p.learning, player.grade, taipeiDay());
    const study = p.learning.study?.session;
    if (study) {
      const source = questionById(study.questions[study.index]);
      const { answer, explanation, target, ...question } = source;
      studyQuestions[player.id] = { ...question, ...(study.settled ? { answer, explanation, target } : {}) };
      study.questions = study.questions.map((id, index) => index === study.index ? id : "");
    }
    for(const captureRun of [r,p.mathIsland?.run]) {
      const capture=captureRun?.capture;
      if(capture?.version===3&&capture.trial) {
        const index=captureIndex(capture), source=questionById(capture.trial.questions[index]);
        const {answer,explanation,target,...question}=source;
        captureQuestions[captureRun.id]={...question,...(capture.outcome==='pending'?{}:{answer,explanation,target})};
        capture.trial.questions=capture.trial.questions.map((id,i)=>i===index?id:'');
      }
    }
    if(p.mathIsland?.run) p.mathIsland.run=publicIslandRun(p.mathIsland.run);
    if (r) {
      if (r.status !== "active" && r.answers) reviews[player.id] = r.answers.flatMap((correct, index) =>
        correct ? [] : [{ index, question: questionById(r.questions[index]) }]);
      const source = questionById(r.questions[r.index]);
      const { answer, explanation, target, ...q } = source;
      if (r.status === "active" && r.challenge && !r.challenge.clock && !r.settled) questionAssets[player.id] = {
        runId: r.id, index: r.index,
        images: [...new Set([source.image, ...source.options.map(option => option.image)].filter(Boolean))],
      };
      if(!r.challenge || r.challenge.clock || r.settled) questions[player.id] = {
        ...q,
        ...(r.settled || r.status === "failed"
          ? { answer, explanation, target }
          : {}),
      };
      // Future questions and their identifiers stay on the server.
      r.questions = r.questions.map((id, i) => (i === r.index && (!r.challenge || r.challenge.clock || r.settled) ? id : ""));
    }
  }
  return {
    family,
    questions,
    questionAssets,
    reviews,
    studyQuestions,
    studySummaries,
    captureQuestions,
    username: user.username,
    playerId: user.player_id ?? null,
    displayName: user.display_name ?? null,
    csrf,
    serverNow: Date.now(),
    day: taipeiDay(),
    verified: row.verified,
    legacy: row.legacy_archive !== null,
    canMigrate: !user.member_id && row.family.revision === 0 && row.legacy_archive === null,
  };
}
function applyCommand(family, c, day, receivedAt=Date.now()) {
  const common = ["type", "player"],
    id = c.player;
  assert(
    PLAYERS.some((p) => p.id === id),
    "找不到航海員",
  );
  const p = family.profiles[id];
  const runFields = [...common, "runId", "index"];
  if (p.onboarding && !p.onboarding.confirmed)
    assert(["starter-draw", "starter-confirm"].includes(c.type), "請先迎接你的初始夥伴");
  const studyFields = [...common, "sessionId", "index"];
  const grade = PLAYERS.find(player => player.id === id).grade;
  const idleForStudy = () => assert(p.run?.status !== "active" && (!p.mathIsland?.run || p.mathIsland.run.completed), "先完成或結束目前挑戰，再來複習");
  switch (c.type) {
    case "capture-answer":
      fields(c,[...runFields,"source","choice"]);
      return answerCapture(family,id,c.source,c.runId,c.index,c.choice,day);
    case "capture-skip":
      fields(c,[...common,"runId","source"]);
      return skipCapture(family,id,c.source,c.runId);
    case "review-start":
      fields(c, [...common, "mode", "course"]); idleForStudy();
      return startStudy(p.learning, grade, day, randomUUID(), c.mode, c.course);
    case "review-answer":
      fields(c, [...studyFields, "choice"]); idleForStudy();
      return answerStudy(p.learning, grade, c.sessionId, c.index, c.choice, day);
    case "review-next":
      fields(c, studyFields); idleForStudy();
      return nextStudy(p.learning, c.sessionId, c.index);
    case "review-hint":
      fields(c, studyFields); idleForStudy();
      return hintStudy(p.learning, c.sessionId, c.index);
    case "review-pause":
    case "review-finish":
      fields(c, [...common, "sessionId"]);
      return pauseStudy(p.learning, c.sessionId, c.type === "review-finish");
    case "island-start":
      fields(c, [...common, "mode", "unit", "grade"]);
      return publicIslandRun(startIsland(family, id, c.mode, c.unit, randomUUID(), day, randomInt(0, 2 ** 32), c.grade));
    case "island-help":
      fields(c, runFields);
      return helpIsland(family,id,c.runId,c.index);
    case "island-answer":
      fields(c, [...runFields, "choice"]);
      return answerIsland(family, id, c.runId, c.index, c.choice, day);
    case "island-finish":
      fields(c, [...common, "runId"]);
      return publicIslandRun(finishIsland(family, id, c.runId, day, randomInt(0, 2 ** 32) / 2 ** 32));
    case "island-quit":
      fields(c, [...common, "runId"]);
      return quitIsland(family, id, c.runId);

    case "home-decor":
      Object.assign(p, homeDecorTransition(p, c, Date.now()));
      return true;
    case "territory":
      p.territory = territoryTransition(p.territory, c, Date.now(), p.owned, p.growth.xp);
      depositLearningMaterials(p);
      return { action: c.action };
    case "learning-goal":
      fields(c, [...common, "goal"]);
      setLearningGoal(p, c.goal);
      return true;
    case "starter-draw":
      fields(c, common);
      return drawStarter(family, id, randomInt(0, 2 ** 32) / 2 ** 32, randomInt(0, 2 ** 32) / 2 ** 32);
    case "starter-confirm":
      fields(c, common);
      return confirmStarter(family, id);
    case "start":
      fields(c, [...common, "course", "practice", "timing"]);
      assert(
        typeof c.practice === "boolean" &&
          COURSES[PLAYERS.find((x) => x.id === id).grade].some(
            (x) => x.id === c.course,
          ),
      );
      assert(c.timing===undefined || c.timing==='standard' || c.timing==='relaxed','請選擇挑戰節奏');
      startRun(
        family,
        id,
        c.course,
        randomUUID(),
        randomInt(0, 2147483647),
        c.practice,
        day,
        c.timing ?? p.challengeTiming ?? (PLAYERS.find(x => x.id === id).grade <= 2 ? "relaxed" : "standard"),
      );
      return true;
    case "challenge-mode":
      fields(c,[...common,"runId","mode"]);
      return setChallengeMode(family,id,c.runId,c.mode);
    case "ready-question":
      fields(c,runFields);
      return readyQuestion(family,id,c.runId,c.index,Date.now());
    case "question-timeout":
      fields(c,runFields);
      return answerRun(family,id,c.runId,c.index,null,day,randomInt(0,2**32)/2**32,receivedAt);
    case "answer":
      fields(c, [...runFields, "choice"]);
      return answerRun(family, id, c.runId, c.index, c.choice, day, randomInt(0, 2 ** 32) / 2 ** 32, receivedAt);
    case "correct-run":
      fields(c, [...runFields, "choice"]);
      assert(Number.isInteger(c.index) && Number.isInteger(c.choice));
      return correctRun(family, id, c.runId, c.index, c.choice, day);
    case "skip-remediation":
      fields(c, [...common, "runId"]);
      return skipRemediation(family, id, c.runId);
    case "advance-question":
      fields(c, [...runFields, "prepare"]);
      assert(c.prepare === undefined || typeof c.prepare === "boolean");
      nextQuestion(family, id, c.runId, c.index);
      if (p.run.challenge && !c.prepare) readyQuestion(family, id, c.runId, p.run.index, Date.now());
      return true;
    case "next":
      fields(c, runFields);
      nextQuestion(family, id, c.runId, c.index);
      return true;
    case "skill":
      fields(c, runFields);
      useSkill(family, id, c.runId, c.index);
      return true;
    case "quit":
      fields(c, [...common, "runId"]);
      abandonRun(family, id, c.runId);
      return true;
    case "hint":
      fields(c, runFields);
      markRunAssisted(family, id, c.runId, c.index);
      return true;
    case "battle-start": {
      fields(c, [...common, "course", "used"]);
      assert(Array.isArray(c.used) && c.used.length < 3 && c.used.every(x => typeof x === "string" && x.length < 100));
      const grade = PLAYERS.find(x => x.id === id).grade;
      assert(COURSES[grade].some(x => x.id === c.course));
      const allocation = allocateBattleQuestion(family, id, c.course, randomUUID(), c.used);
      const { answer, explanation, target, ...question } = questionById(allocation.id);
      return { question, token: allocation.token, review: allocation.review };
    }
    case "battle-answer": {
      fields(c, [...common, "token", "question", "choice"]);
      const question = questionById(c.question);
      assert(question && Number.isInteger(c.choice) && c.choice >= 0 && c.choice < question.options.length);
      recordBattleAnswer(family, id, c.token, c.question, c.choice === question.answer, day);
      return question;
    }
    case "claim-reward":
      fields(c, [...common, "runId", "choice"]);
      return claimReward(family, id, c.runId, c.choice, randomInt(0, 2 ** 32) / 2 ** 32);
    case "equip":
      fields(c, [...common, "pet"]);
      assert(
        typeof c.pet === "string" && petById(c.pet) && p.owned[c.pet] > 0,
        "夥伴已不在收藏中",
      );
      p.equipped = c.pet;
      return true;
    case "buy":
      fields(c, [...common, "pet"]);
      buyPet(family, id, c.pet, randomUUID(), day);
      return true;
    case "draw-star":
    case "draw":
      fields(c, common);
      return draw(
        family,
        id,
        randomUUID(),
        randomInt(0, 2 ** 32) / 2 ** 32,
        randomInt(0, 2 ** 32) / 2 ** 32,
        day,
        day,
        c.type === "draw-star",
      );
    case "trade-propose":
      fields(c, [...common, "to", "give", "receive"]);
      assert(PLAYERS.some((x) => x.id === c.to));
      proposeTrade(family, {
        id: randomUUID(),
        from: id,
        to: c.to,
        give: c.give,
        receive: c.receive,
      });
      return true;
    case "trade-accept":
      fields(c, [...common, "tradeId"]);
      acceptTrade(family, id, c.tradeId, day);
      return true;
    case "trade-cancel":
      fields(c, [...common, "tradeId"]);
      assert(family.pendingTrade?.id === c.tradeId, "交換已更新", 409);
      family.pendingTrade = null;
      return true;
    default:
      throw new ApiError(400, "不支援這個操作");
  }
}
export async function createCloudApi({
  guideProvider = createDragonProvider(),
  voiceProvider = createCompanionVoiceProvider(),
  connectionString = process.env.DATABASE_URL,
  origin = process.env.APP_ORIGIN,
  production = process.env.NODE_ENV === "production",
} = {}) {
  assert(connectionString, "資料庫尚未設定", 503);
  assert(
    !production || /^https:\/\/[^/]+$/.test(origin || ""),
    "APP_ORIGIN 必須設定為正式 HTTPS 網址",
    503,
  );
  const pool = new pg.Pool({
    connectionString,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
    lock_timeout: 3000,
  });
  pool.on("error", () => console.error("Database connection unavailable"));
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts(id uuid PRIMARY KEY,username text UNIQUE NOT NULL,password_hash text NOT NULL,recovery_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS game_states(account_id uuid PRIMARY KEY REFERENCES accounts(id),family jsonb NOT NULL,verified jsonb NOT NULL,legacy_archive jsonb,updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,account_id uuid NOT NULL REFERENCES accounts(id),csrf text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS player_logins(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES accounts(id),username text UNIQUE NOT NULL CHECK(username=lower(username)),password_hash text NOT NULL,player_id text NOT NULL CHECK(player_id IN ('quintus','doudou','qingqing','feifei','alston','jay')),display_name text NOT NULL,UNIQUE(account_id,player_id));
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES player_logins(id);
    ALTER TABLE sessions ADD COLUMN IF NOT EXISTS practice_question jsonb;
    CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
    CREATE TABLE IF NOT EXISTS presence_leases(
      token_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
      client_id uuid NOT NULL, player_id text NOT NULL CHECK(player_id IN ('quintus','doudou','qingqing','feifei','alston','jay')),
      sequence bigint NOT NULL, active boolean NOT NULL, seen_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(token_hash,client_id));
    CREATE TABLE IF NOT EXISTS player_last_seen(
      account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      player_id text NOT NULL CHECK(player_id IN ('quintus','doudou','qingqing','feifei','alston','jay')),
      seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(account_id,player_id));
    CREATE TABLE IF NOT EXISTS command_receipts(account_id uuid NOT NULL REFERENCES accounts(id),command_id uuid NOT NULL,payload_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(account_id,command_id));
    CREATE INDEX IF NOT EXISTS receipts_created ON command_receipts(created_at);
    CREATE TABLE IF NOT EXISTS request_limits(key text PRIMARY KEY,count integer NOT NULL,expires_at timestamptz NOT NULL);
    CREATE INDEX IF NOT EXISTS limits_expiry ON request_limits(expires_at);
  `);
  await pool.query("ALTER TABLE presence_leases ADD COLUMN IF NOT EXISTS activity text NOT NULL DEFAULT 'home'");
  // Only migrate legacy checks; subsequent starts avoid taking table DDL locks.
  await pool.query(`DO $$
    DECLARE item record;
    BEGIN
      PERFORM pg_advisory_xact_lock(hashtext('star-tide-grade6-schema'));
      FOR item IN SELECT * FROM (VALUES ('player_logins'),('presence_leases'),('player_last_seen')) AS tables(name) LOOP
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass(item.name)
          AND conname=item.name || '_player_id_check' AND position('jay' in pg_get_constraintdef(oid))=0) THEN
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', item.name, item.name || '_player_id_check');
          EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK(player_id IN (''quintus'',''doudou'',''qingqing'',''feifei'',''alston'',''jay''))', item.name, item.name || '_player_id_check');
        END IF;
      END LOOP;
    END $$`);
  await ensurePlayerFriendships(pool);
  // Preserve recoverable history before cleanup; never create an online lease.
  await backfillPresenceHistory(pool);
  const cookieName = production ? "__Host-star-tide" : "star-tide-session";
  const cookie = (value, age = 2592000) =>
    `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${production ? "; Secure" : ""}`;
  async function limit(key, max, seconds) {
    const bucket = Math.floor(Date.now() / (seconds * 1000)),
      k = hash(key) + ":" + bucket;
    const r = await pool.query(
      `INSERT INTO request_limits(key,count,expires_at) VALUES($1,1,now()+($2*interval '1 second')) ON CONFLICT(key) DO UPDATE SET count=request_limits.count+1 RETURNING count`,
      [k, seconds],
    );
    assert(r.rows[0].count <= max, "操作太頻繁，請稍後再試", 429);
  }
  const cleanup = setInterval(
    () =>
      pool
        .query(
          `DELETE FROM presence_leases WHERE seen_at<now()-interval '1 day'; DELETE FROM sessions WHERE expires_at<now(); DELETE FROM command_receipts WHERE created_at<now()-interval '30 days'; DELETE FROM request_limits WHERE expires_at<now(); DELETE FROM companion_voice_receipts WHERE created_at<now()-interval '7 days'; UPDATE companion_voice_conversations SET history=(SELECT COALESCE(jsonb_agg(h),'[]'::jsonb) FROM jsonb_array_elements(history) h WHERE (h->>'at')::bigint>extract(epoch FROM now()-interval '7 days')*1000) WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(history) h WHERE (h->>'at')::bigint<=extract(epoch FROM now()-interval '7 days')*1000);`,
        )
        .catch(() => {}),
    60000,
  );
  cleanup.unref();
  async function transaction(fn) {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      const result = await fn(db);
      await db.query("COMMIT");
      return result;
    } catch (e) {
      await db.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      db.release();
    }
  }
  async function newSession(db, accountId, memberId = null) {
    const secret = token(),
      csrf = token();
    await db.query(
      "DELETE FROM sessions WHERE account_id=$1 AND member_id IS NOT DISTINCT FROM $2::uuid AND (expires_at<now() OR token_hash IN (SELECT token_hash FROM sessions WHERE account_id=$1 AND member_id IS NOT DISTINCT FROM $2::uuid ORDER BY created_at DESC OFFSET 9))",
      [accountId, memberId],
    );
    await db.query(
      `INSERT INTO sessions(token_hash,account_id,csrf,expires_at,member_id) VALUES($1,$2,$3,now()+interval '30 days',$4)`,
      [hash(secret), accountId, csrf, memberId],
    );
    if (memberId) {
      const member = (await db.query("SELECT player_id FROM player_logins WHERE id=$1 AND account_id=$2", [memberId,accountId])).rows[0];
      if (member) await recordPlayerSeen(db,accountId,member.player_id);
    }
    return { secret, csrf };
  }
  async function authenticate(req) {
    const secret = String(req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1);
    assert(secret && /^[a-f0-9]{64}$/.test(secret), "請登入家庭帳號", 401);
    const r = await pool.query(
      `SELECT a.id,COALESCE(m.username,a.username) username,s.csrf,s.token_hash,s.member_id,m.player_id,m.display_name,m.trial_curriculum FROM sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN player_logins m ON m.id=s.member_id AND m.account_id=a.id WHERE s.token_hash=$1 AND s.expires_at>now() AND (s.member_id IS NULL OR m.id IS NOT NULL)`,
      [hash(secret)],
    );
    assert(r.rows[0], "登入已到期，請重新登入", 401);
    return r.rows[0];
  }
  async function lockSession(db, user) {
    // Account -> session -> game state is the shared lock order with login/recovery.
    await db.query("SELECT id FROM accounts WHERE id=$1 FOR SHARE", [user.id]);
    const valid = await db.query(
      "SELECT token_hash FROM sessions WHERE token_hash=$1 AND account_id=$2 AND csrf=$3 AND member_id IS NOT DISTINCT FROM $4::uuid AND expires_at>now() FOR UPDATE",
      [user.token_hash, user.id, user.csrf, user.member_id ?? null],
    );
    assert(valid.rowCount === 1, "登入已到期，請重新登入", 401);
  }
  const guide = await createGuideService({ pool, transaction, lockSession, assert, limit, provider: guideProvider });
  const voice = await createCompanionVoiceService({ pool, transaction, lockSession, assert, limit, provider: voiceProvider, guide });
  const onlineBattle = await createOnlineBattleService({ pool, transaction, lockSession, assert });
  async function friends(user) {
    const connected = await connectedPlayerFriends(pool, user);
    if (connected) return connected;
    const { rows } = await pool.query(`
      SELECT p.player_id, m.display_name, h.seen_at,
        (SELECT l.activity FROM presence_leases l JOIN sessions s ON s.token_hash=l.token_hash
         LEFT JOIN player_logins owner ON owner.id=s.member_id AND owner.account_id=s.account_id
         WHERE s.account_id=$1 AND s.expires_at>now() AND l.player_id=p.player_id
           AND (s.member_id IS NULL OR owner.player_id=l.player_id) AND l.active
           AND l.seen_at>now()-interval '35 seconds' ORDER BY l.seen_at DESC LIMIT 1) AS activity,
        g.family->'profiles'->p.player_id AS profile,
        (SELECT max(l.seen_at) + interval '35 seconds'
         FROM presence_leases l JOIN sessions s ON s.token_hash=l.token_hash
         LEFT JOIN player_logins member ON member.id=s.member_id AND member.account_id=s.account_id
         WHERE s.account_id=$1 AND s.expires_at>now() AND l.player_id=p.player_id
           AND (s.member_id IS NULL OR member.player_id=l.player_id)
           AND l.active AND l.seen_at>now()-interval '35 seconds') AS online_until
      FROM unnest($2::text[]) AS p(player_id)
      LEFT JOIN player_logins m ON m.account_id=$1 AND m.player_id=p.player_id
      LEFT JOIN player_last_seen h ON h.account_id=$1 AND h.player_id=p.player_id
      LEFT JOIN game_states g ON g.account_id=$1
      ORDER BY array_position($2::text[], p.player_id)`,
      [user.id, PLAYERS.map(p => p.id)]);
    return { serverNow: Date.now(), friends: rows.map(row => ({
      id: row.player_id,
      activity: row.online_until ? row.activity : null,
      name: row.display_name || PLAYERS.find(p => p.id === row.player_id).name,
      lastSeenAt: row.seen_at ? row.seen_at.getTime() : null,
      hasActivity: hasAdventureHistory(row.profile),
      onlineUntil: row.online_until ? row.online_until.getTime() : null,
    })) };
  }
  async function heartbeat(user, body) {
    fields(body, ["clientId", "player", "sequence", "active", "activity"]);
    assert(uuid(body.clientId) && PLAYERS.some(p => p.id === body.player)
      && Number.isSafeInteger(body.sequence) && body.sequence > 0
      && typeof body.active === "boolean");
    assert(body.activity === undefined || (typeof body.activity === "string" && Object.hasOwn(ACTIVITIES, body.activity)), "活動狀態無效");
    assert(!user.member_id || body.player === user.player_id, "只能更新自己的在線狀態", 403);
    await transaction(async db => {
      await lockSession(db, user);
      const old = (await db.query(
        "SELECT * FROM presence_leases WHERE token_hash=$1 AND client_id=$2",
        [user.token_hash, body.clientId])).rows[0];
      if (old && Number(old.sequence) >= body.sequence) return;
      assert(!old || old.player_id === body.player, "分頁的航海員已更換", 409);
      // Keep a tombstone even when leave overtakes the first heartbeat.
      // Otherwise that delayed heartbeat could resurrect a closed tab.
      if (!old) {
        const count = await db.query("SELECT count(*) FROM presence_leases WHERE token_hash=$1 AND seen_at>now()-interval '35 seconds'", [user.token_hash]);
        assert(Number(count.rows[0].count) < 16, "開啟的分頁太多，請關閉部分分頁", 429);
      }
      const changed = await db.query(`
        INSERT INTO presence_leases(token_hash,client_id,player_id,sequence,active,activity,seen_at)
        VALUES($1,$2,$3,$4,$5,$6,now())
        ON CONFLICT(token_hash,client_id) DO UPDATE SET player_id=$3,sequence=$4,active=$5,activity=$6,
          seen_at=CASE WHEN $5 OR (presence_leases.active AND presence_leases.seen_at>now()-interval '35 seconds')
            THEN now() ELSE presence_leases.seen_at END
        RETURNING seen_at`,
        [user.token_hash, body.clientId, body.player, body.sequence, body.active, body.activity ?? "home"]);
      if (!body.active && (!old || !old.active)) return;
      await db.query(`INSERT INTO player_last_seen(account_id,player_id,seen_at) VALUES($1,$2,$3)
        ON CONFLICT(account_id,player_id) DO UPDATE SET seen_at=GREATEST(player_last_seen.seen_at,EXCLUDED.seen_at)`,
        [user.id, body.player, changed.rows[0].seen_at]);
    });
  }
  const send = (res, status, data, headers = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    });
    res.end(JSON.stringify(data));
  };
  async function readBody(req) {
    assert(
      req.headers["content-type"]?.split(";")[0] === "application/json",
      "請使用 JSON",
      415,
    );
    assert(
      Number(req.headers["content-length"] || 0) <= 1_000_000,
      "資料太大",
      413,
    );
    let size = 0,
      chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      assert(size <= 1_000_000, "資料太大", 413);
      chunks.push(chunk);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      throw new ApiError(400, "JSON 格式不正確");
    }
  }
  const adminService = await createAdminService({pool, production, limit, readBody, send});
  let activeRequests = 0;
  async function handler(req, res) {
    if (activeRequests >= 64) {
      send(res, 503, { error: "雲端忙碌中，請稍後再試" });
      return;
    }
    activeRequests++;
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      assert(["GET", "POST"].includes(req.method), "不支援的方法", 405);
      if (req.method === "POST")
        assert(
          req.headers.origin === (origin || `http://${req.headers.host}`),
          "來源驗證失敗，請重新開啟網站",
          403,
        );
      if (path.startsWith('/api/admin/')) { await adminService(req,res,path); return; }
      const authPath = ["/api/register", "/api/login", "/api/recover"].includes(
        path,
      );
      if (authPath) {
        assert(req.method === "POST", "不支援的方法", 405);
        // Railway edge supplies the last address. Never accept arbitrary first XFF entries.
        const ip = production
          ? String(req.headers["x-forwarded-for"] || req.socket.remoteAddress)
              .split(",")
              .at(-1)
              .trim()
          : req.socket.remoteAddress;
        await limit("auth-ip:" + ip, 30, 600);
        const body = await readBody(req);
        fields(
          body,
          path === "/api/recover"
            ? ["username", "password", "recoveryCode"]
            : ["username", "password"],
        );
        assert(
          typeof body.username === "string" &&
            /^[a-zA-Z0-9_]{3,32}$/.test(body.username),
          "帳號請使用 3–32 個英文字母、數字或底線",
        );
        const username = body.username.toLowerCase();
        await limit("auth-user:" + username, 10, 600);
        const member = (await pool.query("SELECT * FROM player_logins WHERE username=$1", [username])).rows[0];
        if (member) {
          assert(path === "/api/login", "這是預設玩家帳號，請直接登入；帳號調整請由家長處理", 403);
          assert(await passwordMatches(body.password, member.password_hash), "帳號或密碼不正確", 401);
          const data = await transaction(async (db) => {
            await db.query("SELECT id FROM accounts WHERE id=$1 FOR SHARE", [member.account_id]);
            const current = (await db.query("SELECT * FROM player_logins WHERE id=$1 FOR SHARE", [member.id])).rows[0];
            assert(current && current.password_hash === member.password_hash && current.account_id === member.account_id && current.player_id === member.player_id, "帳號已更新，請重新登入", 401);
            const session = await newSession(db, member.account_id, member.id);
            const row = (await db.query("SELECT * FROM game_states WHERE account_id=$1", [member.account_id])).rows[0];
            return { ...publicState(row, { ...member, member_id: member.id }, session.csrf), secret: session.secret };
          });
          const { secret, ...payload } = data;
          send(res, 200, payload, { "Set-Cookie": cookie(secret) });
          return;
        }
        const credential = await pool.query(
          "SELECT * FROM accounts WHERE username=$1",
          [username],
        );
        let account = credential.rows[0],
          recoveryCode,
          password;
        if (path === "/api/register") {
          assert(!account, "這個帳號已有人使用", 409);
          password = await passwordHash(body.password);
          recoveryCode = token();
        } else if (path === "/api/login") {
          const valid = await passwordMatches(
            body.password,
            account?.password_hash ||
              "00000000000000000000000000000000:" + "0".repeat(128),
          );
          assert(account && valid, "帳號或密碼不正確", 401);
        } else {
          assert(
            account &&
              typeof body.recoveryCode === "string" &&
              timingSafeEqual(
                Buffer.from(hash(body.recoveryCode.trim())),
                Buffer.from(account.recovery_hash),
              ),
            "帳號或復原碼不正確",
            401,
          );
          password = await passwordHash(body.password);
          recoveryCode = token();
        }
        const data = await transaction(async (db) => {
          await db.query("SELECT pg_advisory_xact_lock(hashtext('star-tide-player-logins'))");
          const memberNow = await db.query("SELECT id FROM player_logins WHERE username=$1", [username]);
          assert(memberNow.rowCount === 0, "這是預設玩家帳號，請重新登入", 403);
          if (path === "/api/register") {
            account = { id: randomUUID(), username };
            await db.query(
              "INSERT INTO accounts(id,username,password_hash,recovery_hash) VALUES($1,$2,$3,$4)",
              [account.id, username, password, hash(recoveryCode)],
            );
            await db.query(
              "INSERT INTO game_states(account_id,family,verified) VALUES($1,$2,$3)",
              [account.id, newOnboardingFamily(), zeroScores()],
            );
          } else if (path === "/api/recover") {
            const changed = await db.query(
              "UPDATE accounts SET password_hash=$1,recovery_hash=$2 WHERE id=$3 AND recovery_hash=$4 RETURNING id",
              [
                password,
                hash(recoveryCode),
                account.id,
                hash(body.recoveryCode.trim()),
              ],
            );
            assert(changed.rowCount === 1, "復原碼已使用", 409);
            await db.query("DELETE FROM sessions WHERE account_id=$1", [
              account.id,
            ]);
          } else {
            // Serialize with recovery so a just-revoked password cannot create a new session.
            const current = await db.query(
              "SELECT password_hash FROM accounts WHERE id=$1 FOR UPDATE",
              [account.id],
            );
            assert(
              current.rows[0].password_hash === account.password_hash,
              "密碼已變更，請重新登入",
              401,
            );
          }
          const session = await newSession(db, account.id);
          const row = (
            await db.query("SELECT * FROM game_states WHERE account_id=$1", [
              account.id,
            ])
          ).rows[0];
          return {
            ...publicState(row, account, session.csrf),
            recoveryCode,
            secret: session.secret,
          };
        });
        const { secret, ...payload } = data;
        send(res, 200, payload, { "Set-Cookie": cookie(secret) });
        return;
      }
      const user = await authenticate(req);
      await limit("account:" + user.id, 300, 60);
      if (req.method === "POST")
        assert(
          req.headers["x-csrf-token"] === user.csrf,
          "安全驗證已更新，請重新整理",
          403,
        );
      if (path === "/api/guide" && req.method === "GET") {
        send(res, 200, await guide.read(user, new URL(req.url, "http://localhost").searchParams.get("player")));
        return;
      }
      if (path === "/api/companion-talk" && req.method === "GET") {
        send(res, 200, await voice.read(user, new URL(req.url, "http://localhost").searchParams.get("player")));
        return;
      }
      if (path === "/api/online-battle" && req.method === "GET") {
        send(res, 200, await onlineBattle.read(user, new URL(req.url, "http://localhost").searchParams.get("player")));
        return;
      }
      if (path === "/api/collections" && req.method === "GET") {
        const params=new URL(req.url,"http://localhost").searchParams;
        send(res,200,await readPlayerCollections(pool,user,{player:params.get("player"),target:params.get("target")},assert));
        return;
      }
      if (path === "/api/friends" && req.method === "GET") {
        send(res, 200, await friends(user));
        return;
      }
      if (path === "/api/state" && req.method === "GET") {
        const row = (
          await pool.query("SELECT * FROM game_states WHERE account_id=$1", [
            user.id,
          ])
        ).rows[0];
        send(res, 200, publicState(row, user, user.csrf));
        return;
      }
      assert(req.method === "POST", "找不到服務", 404);
      const body = await readBody(req);
      const receivedAt=Date.now();
      if (path === "/api/companion-talk" || path === "/api/companion-talk/reset" || path === "/api/companion-talk/speech") {
        const result = path.endsWith('/reset') ? await voice.reset(user, body) : path.endsWith('/speech') ? await voice.speech(user, body) : await voice.turn(user, body);
        send(res, 200, result);
        return;
      }
      if (path === "/api/guide") {
        send(res, 200, await guide.turn(user, body));
        return;
      }
      if (path === "/api/online-battle") {
        send(res, 200, await onlineBattle.command(user, body));
        return;
      }
      if (path === "/api/presence") {
        await heartbeat(user, body);
        send(res, 200, await friends(user));
        return;
      }
      if (path === "/api/recovery-code") {
        assert(!user.member_id, "預設玩家帳號請由家長管理", 403);
        fields(body, ["password"]);
        await limit("recovery-rotate:" + user.id, 5, 600);
        const account = (
          await pool.query("SELECT password_hash FROM accounts WHERE id=$1", [
            user.id,
          ])
        ).rows[0];
        assert(
          await passwordMatches(body.password, account.password_hash),
          "密碼不正確",
          401,
        );
        const recoveryCode = token();
        await transaction(async (db) => {
          const current = (
            await db.query(
              "SELECT password_hash FROM accounts WHERE id=$1 FOR UPDATE",
              [user.id],
            )
          ).rows[0];
          assert(
            current.password_hash === account.password_hash,
            "密碼已更新，請重新登入",
            401,
          );
          await lockSession(db, user);
          await db.query("UPDATE accounts SET recovery_hash=$2 WHERE id=$1", [
            user.id,
            hash(recoveryCode),
          ]);
        });
        send(res, 200, { recoveryCode });
        return;
      }
      if (path === "/api/practice") {
        // Historical clients share the same durable, account-owned question history.
        // No points/inventory are awarded by this endpoint.
        if (body.type === "start") fields(body, ["type", "player", "used"]);
        else { fields(body, ["type", "question", "choice"]); assert(body.type === "answer"); }
        const question = await transaction(async db => {
          await lockSession(db, user);
          const row = (await db.query("SELECT * FROM game_states WHERE account_id=$1 FOR UPDATE", [user.id])).rows[0];
          const family = applySchoolCurriculum(validateFamily(row.family), user);
          let q, saved;
          if (body.type === "start") {
            assert(!user.member_id || body.player === user.player_id, "只能操作自己的航海員", 403);
            const player = PLAYERS.find(p => p.id === body.player);
            assert(player && Array.isArray(body.used) && body.used.length < 3
              && body.used.every(id => typeof id === "string" && id.length < 100));
            const course = player.grade === 1 ? "english" : player.grade === 2
              ? body.used.length % 2 ? "math" : "words" : COURSES[player.grade][body.used.length % COURSES[player.grade].length].id;
            const p = family.profiles[player.id];
            const reserved = (await db.query("SELECT practice_question FROM sessions WHERE account_id=$1 AND expires_at>now()", [user.id])).rows
              .flatMap(s => s.practice_question?.player === player.id && !s.practice_question.answered ? [s.practice_question.id] : []);
            try {
              const allocation = allocateQuestions(p.learning, player.grade, course, 1, undefined,
                [...body.used, ...reserved, ...(p.run?.status === "active" ? p.run.questions : []), ...(p.learning.pending ? [p.learning.pending.question] : [])])[0];
              q = questionById(allocation.id);
            } catch (e) { throw new ApiError(400, e.message); }
            saved = { id: q.id, player: player.id, answered: false };
          } else {
            const session = (await db.query("SELECT practice_question FROM sessions WHERE token_hash=$1", [user.token_hash])).rows[0];
            saved = session?.practice_question;
            assert(saved?.id === body.question && PLAYERS.some(p => p.id === saved.player), "助戰題目已更新，請重新開始", 409);
            assert(!user.member_id || saved.player === user.player_id, "只能操作自己的航海員", 403);
            q = questionById(saved.id);
            assert(q && Number.isInteger(body.choice) && body.choice >= 0 && body.choice < q.options.length);
            if (saved.answered) { assert(saved.choice === body.choice, "這題已作答", 409); return q; }
            observeStudy(family.profiles[saved.player].learning, q, body.choice === q.answer, false, taipeiDay());
            if (body.choice === q.answer) markMastered(family.profiles[saved.player].learning, q.id);
            saved = { ...saved, answered: true, choice: body.choice };
          }
          applySchoolCurriculum(family,user);
          family.revision = row.family.revision + 1;
          await db.query("UPDATE game_states SET family=$2,updated_at=now() WHERE account_id=$1", [user.id, validateFamily(family)]);
          await db.query("UPDATE sessions SET practice_question=$2 WHERE token_hash=$1", [user.token_hash, saved]);
          return q;
        });
        if (body.type === "start") {
          const { answer, explanation, target, ...publicQuestion } = question;
          send(res, 200, publicQuestion);
        } else send(res, 200, question);
        return;
      }
      if (path === "/api/logout") {
        fields(body, []);
        await transaction(async (db) => {
          await lockSession(db, user);
          await db.query("DELETE FROM sessions WHERE token_hash=$1", [
            user.token_hash,
          ]);
        });
        send(res, 200, { ok: true }, { "Set-Cookie": cookie("", 0) });
        return;
      }
      assert(
        path === "/api/command" || path === "/api/migrate",
        "找不到服務",
        404,
      );
      fields(
        body,
        path === "/api/migrate"
          ? ["id", "revision", "snapshot"]
          : ["id", "revision", "command"],
      );
      assert(
        uuid(body.id) &&
          Number.isSafeInteger(body.revision) &&
          body.revision >= 0,
      );
      if (user.member_id) {
        assert(path !== "/api/migrate", "舊家庭進度請由家長轉入", 403);
        assert(object(body.command) && body.command.player === user.player_id, "只能操作自己的航海員", 403);
      }
      const digest = hash(JSON.stringify({ path, ...body }));
      const result = await transaction(async (db) => {
        await lockSession(db, user);
        const row = (
          await db.query(
            "SELECT * FROM game_states WHERE account_id=$1 FOR UPDATE",
            [user.id],
          )
        ).rows[0];
        const receipt = (
          await db.query(
            "SELECT * FROM command_receipts WHERE account_id=$1 AND command_id=$2",
            [user.id, body.id],
          )
        ).rows[0];
        if (receipt) {
          assert(receipt.payload_hash === digest, "操作編號已使用", 409);
          if (path === "/api/command") await recordPlayerSeen(db,user.id,body.command.player);
          return {
            ...publicState(row, user, user.csrf),
            result: receipt.result?.kind === "answer-capture-v1" ? receipt.result.correct : receipt.result,
            ...(receipt.result?.kind === "answer-capture-v1" ? { captureReceipt: receipt.result.captureReceipt } : {}),
            replayed: true,
          };
        }
        if (user.member_id && body.command?.type === "trade-cancel") {
          const trade = row.family.pendingTrade;
          assert(trade && [trade.from, trade.to].includes(user.player_id), "只能取消自己參與的交換", 403);
        }
        // Monotonic revision rejects an expired receipt replay after cleanup.
        assert(
          row.family.revision === body.revision,
          "另一個裝置已更新進度，請重新查看後操作",
          409,
        );
        let result = true,
          family = applySchoolCurriculum(validateFamily(row.family), user);
        if (path === "/api/migrate") {
          assert(
            row.legacy_archive === null && family.revision === 0,
            "雲端已有進度，不能覆寫。這個裝置的原始進度仍保留。",
            409,
          );
          try {
            if (body.snapshot?.format === "legacy-academy") {
              fields(body.snapshot, ["format", "milestones", "equipped"]);
              assert(typeof body.snapshot.milestones === "string");
              family = newFamily(
                body.snapshot.milestones,
                typeof body.snapshot.equipped === "string"
                  ? body.snapshot.equipped
                  : null,
              );
            } else family = validateFamily(body.snapshot);
          } catch {
            throw new ApiError(
              400,
              "舊進度格式無法讀取，原始資料仍在這個裝置，沒有更動雲端進度。",
            );
          }
          // Local imports cannot mint server-earned captures. Reject the entire
          // snapshot before archiving or replacing cloud progress.
          assert(Object.values(family.profiles).every(p => ![
            ...Object.keys(p.owned), ...Object.keys(p.firstAcquired), p.equipped, p.run?.companion,
          ].some(id => monsterById(id))), "舊進度含有只能由雲端取得的降服夥伴，尚未匯入；原始資料仍保留。", 400);
          row.legacy_archive = body.snapshot;
          family.pendingTrade = null;
          family.log = [];
          for (const { id } of PLAYERS) {
            const p = family.profiles[id];
            if (p.run?.reward !== "pending") p.run = null;
            p.learning.pending = null;
            // Territory rewards can only originate in authenticated server commands.
            delete p.mathIsland;
            delete p.territory;
            delete p.captureQuota;
            if (p.run) { delete p.run.capture; delete p.run.encounter.combat; delete p.run.encounter.route; delete p.run.materials; delete p.run.challenge; delete p.run.remediation; }
            delete p.learningRewards;
            delete p.homeDecor;
            p.starTickets = 0; // Special invitations can only be issued by an operator.
            delete p.lastDraw; // Imported history is not a server-issued draw receipt.
            // Imported eligibility is never trusted; keep an existing drawn anchor only.
            if (p.onboarding?.pet) p.onboarding.confirmed = true;
            else delete p.onboarding;
            // Imported snapshots are historical, never trusted server-earned XP.
            p.growth = { xp: {}, day: taipeiDay(), credited: [] };
            if (p.run) p.run.encounter.earned = 0;
            if (p.day !== taipeiDay()) p.rewardRounds = 0;
            p.credited = [];
            p.attempted = [];
            p.day = taipeiDay();
            p.draws = 0;
            for (const pet of Object.keys(p.firstAcquired))
              p.firstAcquired[pet] = null;
          }
        } else {
          assert(object(body.command));
          const before = Object.fromEntries(
            PLAYERS.map(({ id }) => [
              id,
              family.profiles[id].milestones.masteryPoints,
            ]),
          );
          try {
            result = applyCommand(family, body.command, taipeiDay(),receivedAt);
          } catch (e) {
            if (e instanceof ApiError) throw e;
            throw new ApiError(400, e.message);
          }
          for (const { id } of PLAYERS)
            row.verified[id] = (row.verified[id] ?? 0) + Math.max(
              0,
              family.profiles[id].milestones.masteryPoints - before[id],
            );
        }
        applySchoolCurriculum(family,user);
        family.revision = row.family.revision + 1;
        row.family = validateFamily(family);
        await db.query(
          "UPDATE game_states SET family=$2,verified=$3,legacy_archive=$4,updated_at=now() WHERE account_id=$1",
          [user.id, row.family, row.verified, row.legacy_archive],
        );
        const completedRun = path === "/api/command" && ["answer","question-timeout"].includes(body.command.type)
          ? row.family.profiles[body.command.player].run : null;
        const captureReceipt = completedRun?.capture && completedRun.status === "won"
          ? { runId: completedRun.id, ...completedRun.capture } : undefined;
        if(captureReceipt?.trial) captureReceipt.trial={...captureReceipt.trial,questions:captureReceipt.trial.questions.map(()=>"")};
        // Keep the public boolean answer contract, but receipt replays also carry
        // the original capture even if another device has started a newer run.
        const storedResult = captureReceipt ? { kind: "answer-capture-v1", correct: result, captureReceipt } : result;
        await db.query(
          "INSERT INTO command_receipts(account_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4)",
          [user.id, body.id, digest, JSON.stringify(storedResult)],
        );
        if (path === "/api/command") await recordPlayerSeen(db,user.id,body.command.player);
        return {
          ...publicState(row, user, user.csrf),
          result,
          ...(captureReceipt ? { captureReceipt } : {}),
          replayed: false,
        };
      });
      send(res, 200, result);
    } catch (e) {
      if (!res.writableEnded)
        send(res, e.status || (e.code === "23505" ? 409 : 503), {
          error: e.status
            ? e.message
            : e.code === "23505"
              ? "帳號已有人使用"
              : "雲端暫時無法連線，請稍後重試；已完成的進度仍在帳號中",
        });
      if (!e.status && e.code !== "23505")
        console.error("Cloud operation failed", e.code || e.name);
    } finally {
      activeRequests--;
    }
  }
  handler.close = async () => {
    clearInterval(cleanup);
    await pool.end();
  };
  handler.pool = pool;
  return handler;
}
