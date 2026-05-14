import type React from "react";

const CATEGORY_ICONS: [string[], React.ReactNode][] = [
  [["حبوب", "دقيق", "طحين"], <><path key="w1" d="M12 22V2"/><path key="w2" d="M5 8c2-1 3.5-1.5 5-1 0 0-1.5 2-5 3"/><path key="w3" d="M19 8c-2-1-3.5-1.5-5-1 0 0 1.5 2 5 3"/><path key="w4" d="M5 13c2-1 3.5-1.5 5-1 0 0-1.5 2-5 3"/><path key="w5" d="M19 13c-2-1-3.5-1.5-5-1 0 0 1.5 2 5 3"/></>],
  [["خبز", "مخبوز"], <><path key="br1" d="M5 8a7 7 0 0114 0c0 3-2 5-7 5S5 11 5 8z"/><path key="br2" d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"/></>],
  [["أرز", "معكرونة"], <><path key="r1" d="M4 11a8 8 0 0116 0"/><path key="r2" d="M4 11c0 5 3.5 9 8 9s8-4 8-9"/><circle key="r3" cx="9" cy="8" r="1"/><circle key="r4" cx="15" cy="8" r="1"/><circle key="r5" cx="12" cy="6" r="1"/></>],
  [["زيوت", "شحوم", "زيت"], <><path key="o1" d="M10 2h4l2 4H8l2-4z"/><rect key="o2" x="8" y="6" width="8" height="14" rx="2"/><path key="o3" d="M12 12a2 2 0 100 4 2 2 0 000-4z"/></>],
  [["سكر", "ملح"], <><rect key="s1" x="2" y="10" width="8" height="8" rx="1"/><rect key="s2" x="14" y="10" width="8" height="8" rx="1"/><rect key="s3" x="8" y="4" width="8" height="8" rx="1"/></>],
  [["بقوليات", "معلب"], <><rect key="j1" x="6" y="6" width="12" height="14" rx="2"/><path key="j2" d="M8 4h8a1 1 0 011 1v1H7V5a1 1 0 011-1z"/><line key="j3" x1="10" y1="10" x2="10" y2="16"/><line key="j4" x1="14" y1="10" x2="14" y2="16"/></>],
  [["فواكه"], <><path key="a1" d="M12 3c-1-1-3.5-1-4.5 0S5 6 5 9c0 5 3 9 7 12 4-3 7-7 7-12 0-3-1.5-5-2.5-6S13 2 12 3z"/><path key="a2" d="M12 3c0-1.5 1.5-2.5 3-2"/></>],
  [["لحوم", "دواجن", "دجاج"], <><path key="m1" d="M15.5 2.5A4 4 0 0121 5a4 4 0 01-2.5 5.5L14 15l-1.5 1.5"/><path key="m2" d="M14 15l-3 3-6-6 3-3"/><path key="m3" d="M2 22l3-3"/></>],
  [["توابل", "بهارات"], <><path key="p1" d="M12 2c0 3-3 5-3 8a3 3 0 006 0c0-3-3-5-3-8z"/><path key="p2" d="M9 14c-2 1-3 3-3 5a3 3 0 003 3h6a3 3 0 003-3c0-2-1-4-3-5"/></>],
  [["خضروات", "خضار"], <><path key="c1" d="M8 22l4-18"/><path key="c2" d="M16 22l-4-18"/><path key="c3" d="M12 4c-2-2-5-1-6 1"/><path key="c4" d="M12 4c2-2 5-1 6 1"/><path key="c5" d="M6 10l12 0"/><path key="c6" d="M5 16l14 0"/></>],
  [["أسماك", "سمك"], <><path key="f1" d="M6.5 12c3-6 10-6 14-2-4 4-11 4-14-2z"/><path key="f2" d="M6.5 12c-3-3-4-6-4.5-8 2.5 1 5 3 6 5"/><path key="f3" d="M6.5 12c-3 3-4 6-4.5 8 2.5-1 5-3 6-5"/><circle key="f4" cx="16" cy="10" r="1"/></>],
  [["بيض", "ألبان"], <><ellipse key="e1" cx="12" cy="13" rx="7" ry="9"/></>],
  [["مياه", "عصائر"], <><rect key="w1" x="8" y="6" width="8" height="16" rx="2"/><path key="w2" d="M10 2h4v4h-4z"/><path key="w3" d="M10 12h4"/></>],
  [["شاي", "قهوة"], <><path key="t1" d="M18 8h1a4 4 0 010 8h-1"/><path key="t2" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path key="t3" d="M6 1v3"/><path key="t4" d="M10 1v3"/><path key="t5" d="M14 1v3"/></>],
  [["مشروبات غازية"], <><path key="g1" d="M8 2h8l-1 18H9L8 2z"/><line key="g2" x1="7" y1="8" x2="17" y2="8"/></>],
  [["منظف"], <><rect key="cl1" x="6" y="8" width="12" height="14" rx="2"/><path key="cl2" d="M10 4h4v4h-4z"/><path key="cl3" d="M14 4l3-2"/><circle key="cl4" cx="12" cy="15" r="2"/></>],
  [["أدوات المنزل"], <><line key="h1" x1="12" y1="2" x2="12" y2="14"/><path key="h2" d="M5 14h14l-2 8H7l-2-8z"/></>],
  [["عناية شخصية", "عناية"], <><rect key="sp1" x="6" y="10" width="12" height="12" rx="2"/><path key="sp2" d="M11 10V6h4"/><path key="sp3" d="M11 6V3"/></>],
  [["حفاض", "أطفال"], <><circle key="b1" cx="12" cy="7" r="5"/><path key="b2" d="M8 14c0 4 1.5 8 4 8s4-4 4-8"/><circle key="b3" cx="10" cy="6" r="0.5"/><circle key="b4" cx="14" cy="6" r="0.5"/><path key="b5" d="M10 9a2 2 0 004 0"/></>],
  [["أدوية", "طبية"], <><rect key="md1" x="3" y="8" width="8" height="12" rx="4"/><line key="md2" x1="3" y1="14" x2="11" y2="14"/><circle key="md3" cx="18" cy="8" r="4"/><line key="md4" x1="18" y1="6" x2="18" y2="10"/><line key="md5" x1="16" y1="8" x2="20" y2="8"/></>],
  [["مناديل", "ورق"], <><path key="tp1" d="M8 2a4 4 0 014 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a4 4 0 014-4z"/><ellipse key="tp2" cx="8" cy="6" rx="4" ry="2"/><path key="tp3" d="M12 6c0-2 2-4 5-4s5 2 5 4-2 4-5 4"/></>],
  [["وقود", "محروقات"], <><rect key="gp1" x="3" y="6" width="12" height="16" rx="2"/><path key="gp2" d="M15 10l3-3 2 2v8a2 2 0 01-4 0v-3"/><path key="gp3" d="M3 12h12"/></>],
  [["غاز الطهي", "غاز"], <><rect key="fb1" x="3" y="14" width="18" height="6" rx="2"/><path key="fb2" d="M8 14v-2a2 2 0 014 0v2"/><path key="fb3" d="M12 14v-2a2 2 0 014 0v2"/><circle key="fb4" cx="7" cy="8" r="1"/><circle key="fb5" cx="17" cy="8" r="1"/></>],
  [["بطاريات", "مولدات"], <><rect key="bt1" x="2" y="7" width="16" height="10" rx="2"/><line key="bt2" x1="22" y1="11" x2="22" y2="13"/><line key="bt3" x1="7" y1="11" x2="7" y2="13"/><line key="bt4" x1="11" y1="10" x2="11" y2="14"/><line key="bt5" x1="9" y1="12" x2="13" y2="12"/></>],
  [["علف", "حيوان"], <><circle key="co1" cx="8" cy="10" r="4"/><circle key="co2" cx="16" cy="10" r="4"/><path key="co3" d="M4 6l-2-4M20 6l2-4"/><ellipse key="co4" cx="12" cy="18" rx="5" ry="3"/></>],
  [["بذور", "زراعة"], <><path key="se1" d="M12 22V12"/><path key="se2" d="M12 12C12 8 8 6 4 6c0 4 2 8 8 8"/><path key="se3" d="M12 8c0-4 4-6 8-6 0 4-2 8-8 8"/></>],
  [["منتجات أخرى"], <><path key="bx1" d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path key="bx2" d="M3 8l9 5 9-5"/><line key="bx3" x1="12" y1="13" x2="12" y2="21"/></>],
];

const DEFAULT_ICON = <><path key="bx1" d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path key="bx2" d="M3 8l9 5 9-5"/><line key="bx3" x1="12" y1="13" x2="12" y2="21"/></>;
const ALL_ICON = <><rect key="d1" x="3" y="3" width="7" height="7"/><rect key="d2" x="14" y="3" width="7" height="7"/><rect key="d3" x="3" y="14" width="7" height="7"/><rect key="d4" x="14" y="14" width="7" height="7"/></>;

export function getCategoryIconPath(nameAr: string): React.ReactNode {
  for (const [keywords, icon] of CATEGORY_ICONS) {
    if (keywords.some(k => nameAr.includes(k))) return icon;
  }
  return DEFAULT_ICON;
}

export function CategoryIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const iconPath = name === "__all__" ? ALL_ICON : getCategoryIconPath(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {iconPath}
    </svg>
  );
}
