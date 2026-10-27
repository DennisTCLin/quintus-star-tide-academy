import type { LearningQuestion } from './learning';
// Authored alternate questions: preserve evidence, answer meaning and complete choice objects.
const endings = [
 'On which day does Ben need to attend music club?',
 'Which action comes immediately before Tim peels the banana?',
 'Which place should you check to find the blue bag?',
 'Which sentence politely asks Sam to lend Nina a pencil?',
 'At which of these times can someone enter the park today?',
 'Which action comes next when Mia has finished coloring?',
 'Who is sitting in the middle of Amy and Leo?',
 'What should you say when Sam thanks you for your help?',
 'Which part of the trip plan is different in the new note?',
 'Which step comes immediately before Jo covers the seed with soil?',
 'At which place should you take the left turn?',
 'Which sentence asks the teacher to repeat the question politely?',
 'Which tennis day fits May’s plans?',
 'Which activity comes after Anna packs and before she brushes?',
 'In which direction is Ken walking on both parts of his route?',
 'Which answer tells Eva the price of the kite?',
];
export function englishRephrase(q: LearningQuestion): LearningQuestion | undefined {
 let prompt: string | undefined;
 const number = /^c1-g4-english-(\d+)$/.exec(q.id);
 if (number) {
   const lastQuestion = q.prompt.search(/(?:Which day should|What does Tim|Where is the blue|What can Nina|Which time is|What does she|Who has Amy|Which reply responds|What changed|What does Jo|Where do you|What can she|When can she|Which direction|Which reply gives)/);
   if (lastQuestion >= 0) prompt = q.prompt.slice(0,lastQuestion) + endings[Number(number[1])-1];
 } else if (q.id.startsWith('n1-g4-englishread-')) {
   const m = /^Mia has (\d+) red shells? and (\d+) blue shells?\./.exec(q.prompt);
   if (m) {
     const target = q.prompt.includes('in total') ? 'red and blue shells altogether' : q.prompt.includes('How many red') ? 'red shells' : 'blue shells';
     prompt = `Mia’s collection has ${m[2]} blue ${m[2] === "1" ? "shell" : "shells"} and ${m[1]} red ${m[1] === "1" ? "shell" : "shells"}. What is the number of ${target} in her collection?`;
   }
 }
 if (!prompt || prompt === q.prompt) return;
 const options = [...q.options.slice(1), q.options[0]];
 return {...q, id:`r1-${q.id}`, rephraseOf:q.id, prompt, speechText:prompt, promptZy:undefined,
   options, answer:(q.answer + q.options.length - 1) % q.options.length};
}
