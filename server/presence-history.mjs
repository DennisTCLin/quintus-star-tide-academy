// Only server records can supply an individual player's precise activity time.
export async function backfillPresenceHistory(db) {
  await db.query(`
    INSERT INTO player_last_seen(account_id,player_id,seen_at)
    SELECT account_id,player_id,max(seen_at) FROM (
      SELECT s.account_id,m.player_id,s.created_at AS seen_at
      FROM sessions s JOIN player_logins m
        ON m.id=s.member_id AND m.account_id=s.account_id
      UNION ALL
      SELECT g.account_id,p.key AS player_id,r.created_at AS seen_at
      FROM game_states g CROSS JOIN LATERAL jsonb_each(g.family->'profiles') p
      JOIN command_receipts r ON r.account_id=g.account_id
        AND r.result->>'receiptId'=p.value->'lastDraw'->>'id'
        AND r.result->>'kind'='pet'
        AND r.result->>'pet'=p.value->'lastDraw'->>'pet'
      WHERE p.key IN ('quintus','doudou','qingqing','feifei','alston','jay')
    ) evidence GROUP BY account_id,player_id
    ON CONFLICT(account_id,player_id) DO UPDATE
      SET seen_at=GREATEST(player_last_seen.seen_at,EXCLUDED.seen_at)
      WHERE player_last_seen.seen_at<EXCLUDED.seen_at
  `);
}

export async function recordPlayerSeen(db, accountId, playerId) {
  await db.query(`INSERT INTO player_last_seen(account_id,player_id,seen_at) VALUES($1,$2,now())
    ON CONFLICT(account_id,player_id) DO UPDATE
      SET seen_at=GREATEST(player_last_seen.seen_at,EXCLUDED.seen_at)`, [accountId,playerId]);
}

// Old/imported progress proves a saved adventure, not a precise login time.
export function hasAdventureHistory(profile) {
  if (!profile || typeof profile !== 'object') return false;
  return !!(profile.run || profile.lastDraw || profile.onboarding?.pet || profile.gardenImported || profile.territory
    || profile.milestones?.completedVoyages > 0 || profile.milestones?.masteryPoints > 0
    || profile.attempted?.length || profile.credited?.length
    || profile.learning?.seen?.length
    || Object.values(profile.learning?.cursors ?? {}).some(count => count > 0)
    || Object.values(profile.learning?.skills ?? {}).some(skill => skill.answered > 0)
    || Object.keys(profile.owned ?? {}).length > 1
    || Object.values(profile.owned ?? {}).some(count => count > 1)
    || Object.keys(profile.firstAcquired ?? {}).length > 1
    || Object.values(profile.firstAcquired ?? {}).some(date => date !== null)
    || Object.values(profile.growth?.xp ?? {}).some(xp => xp > 0));
}
