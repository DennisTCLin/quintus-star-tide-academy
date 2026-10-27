import {it,expect} from 'vitest';
import {SCHOOL_NAMES,schoolDisplayName} from '../school-curriculum';
it('shows every confirmed school, including Alston Jianan, rather than unknown',()=>{
 for(const [id,name] of Object.entries(SCHOOL_NAMES))expect(schoolDisplayName(id)).toBe(name);
 expect(schoolDisplayName('jianan')).toBe('臺北市大安區建安國小');
 for(const value of [null,undefined,'not-confirmed','constructor','__proto__'])expect(schoolDisplayName(value)).toBe('學校待確認');
});

it('shows a confirmed school without implying a textbook publisher',()=>{
 expect(schoolDisplayName(null,'臺北市大安區幸安國小')).toBe('臺北市大安區幸安國小');
 expect(schoolDisplayName(undefined,'臺北市東門國小')).toBe('臺北市東門國小');
 expect(schoolDisplayName(null,'  ')).toBe('學校待確認');
});
