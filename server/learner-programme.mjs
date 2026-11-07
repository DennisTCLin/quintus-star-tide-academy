// Enrollment is authoritative. Never classify a person from a username/grade slot.
// Standalone operator tools may run before the optional adult-game migration.
export async function schoolMemberPredicate(db,alias='m'){
 const exists=(await db.query("SELECT to_regclass('adult_game_enrollments') AS name")).rows[0]?.name;
 return exists?`NOT EXISTS(SELECT 1 FROM adult_game_enrollments adult WHERE adult.member_id=${alias}.id)`:'true';
}
