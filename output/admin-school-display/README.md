# Admin confirmed-school display

Alston's server roster already maps to jianan. AdminConsole used a separate three-school formatter that omitted Jianan, causing a confirmed school to display as unknown. Reuse the existing SCHOOL_NAMES through schoolDisplayName for both student search and detail display. Unknown/prototype keys still return the existing unknown label.

13 focused school tests PASS and build PASS. Isolated synthetic admin/Alston fixture starts without persisted learning.school; existing server projection correctly supplies jianan. WebKit and Chromium at 390/1024 display 臺北市大安區建安國小 and no unknown label. Root viewed the screenshot. No production student state, rewards, or curriculum mapping modified.

Production release: runtime97e294a, Railwayec29d34a-1988-411d-8fd9-f2c40815c4e6 SUCCESS. Formal index/11JS-CSS files (12 total) match tested dist byte-for-byte; health200/ok, anonymous state401. Published frontend with intercepted synthetic local admin payloads shows confirmed Jianan name and search-by-建安 PASS. No production admin or child login, and no real student progress writes.
