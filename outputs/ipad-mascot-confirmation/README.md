# iPad companion confirmation

Verified production deployment ef4eb2d4-90ee-4db3-b78f-2f6aca768d31 (runtime 7b054a3), including the independent poster and stalled-video recovery fix.

Both dog and Tideglow: all six care actions decode and display frames, high-five and bubbles complete and unlock, rest continues across the loop, pause retains the sleeping pose, resume works, portrait/landscape fit, and injected pending/rejected/broken/stalled media retain a visible character and usable controls. Both work without requestVideoFrameCallback. All six priority MP4s return valid HTTP 206 byte ranges. No JavaScript exceptions. 26 focused unit tests also passed.

Browser evidence uses modern Playwright WebKit with iPad touch, viewport and Safari user-agent emulation. This is NOT a physical iPad or the actual iPadOS 15.4.1 WebKit engine. Synthetic API fixtures avoid real student login or state changes. See results.json and verify.py; PNGs are local visual QA evidence.
