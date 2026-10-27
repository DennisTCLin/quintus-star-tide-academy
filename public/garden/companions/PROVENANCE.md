# Companion asset provenance

Created 2026-10-24 with built-in image generation. These records document the production chain; they are not a legal-clearance or licensing opinion.

## Static portraits

The exact prompts and original PNG paths are retained in the source archive at:

`/Users/dennistclin/Library/Mobile Documents/com~apple~CloudDocs/AI助理｜莫比 Mobi/output/doudou-garden/art/companions/prompts.json`

Each prompt asks for one original, front-facing animal character on a transparent background. The production portraits and thumbnails are 640×640 and 240×240 alpha WebP exports.

| Character | Original PNG SHA-256 | Portrait WebP SHA-256 | Thumbnail WebP SHA-256 |
| --- | --- | --- | --- |
| maltese | `bc79e8283c8eb4ffe5cf8d951e0d5a2da828378241ab238c5b1a9921758b86f2` | `43c2f17b3238e944e1038664db5de4c67806b378459b583e3eeabe0811ae739e` | `4e0f278f7f0299a94c1c3e8df50d2775830f4db22f3db9dee2ca4fcca51c96e4` |
| pig | `b9df860516e33bbe79c34a2d2cec017d0ad626948cc3b9b99d3eb1a163b8076e` | `3735b5a5dd41388df32431254f49cfc843c11583b3a815ef431367d0156d4235` | `293e75b52e6315d7cb60f002cc0b111f952dfbd2857ffc897e79d030417d1036` |
| otter | `0fe30204ca50c895b2bd3c0bfd4dc18010b80e02ca3bc6c60271b830c192e359` | `75b058011e03c6d2be55df0b4c839a00d9a599c47dcd660f3be554eb29e81b42` | `078ddd0b38029e68fcb66e4c6459579f0000ad7937aaafb10ad20f760af08cf9` |
| fox | `7b55f20c9e8275e12b86e7da45be547def1e1bff176aa7c9cc21c27b9576c183` | `fbf7e588ea2d2f0f81a5cd15cfbcbb06b2a263840103446e03b0cade734ea359` | `c447abe1b1da815d01aee01889e974cde9bcbc1d0260037926b923493f35616a` |
| rabbit | `dfd0f2286debeb71279c5c34aa4e788bfc56992013e08686148c9fea49c3b616` | `0ffae8258771b2f4bda3714e57cc25c1e6533d0f20a762899858c3b0536b6d2b` | `7325935936710fe17a0263d5911d8d3c486760fe2fc8b6da6adcaecf83452fef` |

## Motion pose sheets

Five 1254×1254 transparent 4×4 pose sheets contain 16 poses each. The available prompt summary and processing record are retained in the source archive at `qa/pet-motion-report.json`; exact per-call prompts were not retained. Production WebPs derive from the original PNG sheets. Frame rectangles and silhouette hulls were measured by `qa/atlas-bounds.py` and stored in `pet-atlas.js`.

| Character | Original PNG path and SHA-256 | Production atlas SHA-256 |
| --- | --- | --- |
| maltese | `exec-9efca458-60c5-4112-9e1a-8e59904d1055.png` · `88d27865075f3b2f49c81b907ceddf7009ffa46ec1212b00874ff771c435134a` | `94e6589b3d24889487a64fcbdf63fe61655ea31feef8ec4ea754fe55f4bf7d1f` |
| pig | `exec-ae19e692-135e-46ef-a9ed-18a2d6f646fa.png` · `49fac4565d5fbae12fe97c6cfec8f9014139d9fe77e0350ee10fde64d7328a29` | `c9370288a5d280243886965a1afd436e0c710fbb43d8021b25623629466d1bbc` |
| otter | `exec-7b5d2b48-4eb5-4534-aafd-63d2f2d65bee.png` · `2abc58279cd9b19b51f8eda0480e123bbf9d71c69ab91e948596a90393646c50` | `c7722c6f0fc542bca2f1d270a9029a3316f0aa4eea7cd9d037943e3c18bf3c18` |
| fox | `exec-1687939c-fe65-49d7-8e82-570adac830c5.png` · `7a14a60629162cf13d2ce7ee6f27be093d1f11831b9e3d2c3b5c5d5bd618c2b6` | `1ff620ca2210fabef8e108794541348bb4c79a4a48e81b6aed0febaff0712419` |
| rabbit | `exec-69ebe1f2-4c02-4d95-a0e8-d8c37f51daea.png` · `173eda7fc5a08292568b7e429a266037bda5b29179bf4bd2774387bfa7d7a9ce` | `a87f7756a323ca74aa812c7891e040ca7eed0232935b7ad922b44eb00fe6ff54` |

The source archive and generated-image cache retain the full PNG files. Finder provenance attributes alone are not used as evidence of generator, rights, or license.
