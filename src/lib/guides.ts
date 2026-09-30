export const GUIDE_GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Bắt đầu", slugs: ["cach-tao-phong-vote"] },
  { title: "Thêm lựa chọn", slugs: ["cach-dan-link-google-maps"] },
  { title: "Các kiểu vote", slugs: ["cac-kieu-vote-khac-nhau"] },
  { title: "Mời bạn bè", slugs: ["cach-moi-ban-be-qua-zalo"] },
];

export const GUIDE_FLOW = GUIDE_GROUPS.flatMap((g) => g.slugs);
