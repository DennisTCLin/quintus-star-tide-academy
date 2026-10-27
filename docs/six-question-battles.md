# Six-question answer battles

New and resumed answer challenges use six distinct, age-appropriate questions. Each question accepts one answer. Correct answers attack; incorrect answers reduce this encounter's companion HP by approximately one third. The third cumulative mistake immediately ends the challenge with zero HP. Correct answers never reset the mistake count. A new challenge starts with full HP.

Completion requires all six submissions with fewer than three mistakes (at least four correct). The monster retains at least one visual HP until the server confirms completion. A wrong sixth answer can still complete the challenge when total mistakes remain below three; its explanation and voice control remain available on the result screen.

`Run.answers` is a server-authored boolean ledger. HP and correct-hit counts derive from it. A settled question cannot be retried, including wrong answers. Existing command receipts, row locking and revision checks protect concurrent requests. Failed runs cannot advance, use a skill, claim a completion reward or capture a monster. Correct answers already credited to XP, coins and learning materials are retained. Learning materials still accrue every five eligible correct answers, independently of battle completion.

A completed five-question legacy run and its pending reward remain unchanged. An unfinished legacy run is upgraded once on validation: retain the original questions and earned progress, reconstruct completed answers, count a pending incorrect question once, and append a unique sixth question. Historical corrections cannot be reconstructed and are not retroactively penalized. Retired courses can resume their original question pool but remain unavailable for new starts. Six-question runs without a ledger are rejected. Deployment rollback must retain the new reader; do not redeploy the earlier five-question-only validator over migrated saves.

This change applies to learning/answer encounters. The separate CPU/duo move-based arena and its optional knowledge Buff system are unchanged.

Validation: exhaustive 64 answer patterns; 15 independently checked legacy progress combinations; all grades/courses; six correct answers (60 XP, 120 voyage points); replay/concurrent request IDs and second-device reload against PostgreSQL; desktop failure sequence wrong/correct/wrong/correct/wrong; 390px grade-two four-correct/two-wrong completion and final-answer explanation.

New wording includes reviewed pronunciation [累計 ㄌㄟˇ ㄐㄧˋ](https://dict.concised.moe.edu.tw/dictView.jsp?ID=13370&la=0&powerMode=0). The phrase override is applied to complete sentences as well as isolated words.
