export const colors = {
  onPrimary: "#FFFFFF",
  bg: "#F4F6F4",
  paper: "#FFFFFF",
  ink: "#172F2B",
  muted: "#637570",
  primary: "#176B50",
  dark: "#102E2A",
  mint: "#DFF1E8",
  lime: "#D7F18C",
  line: "#E0E7E2",
  warning: "#956011",
  warningBg: "#FFF1D6",
  red: "#B44242",
  redBg: "#FBE8E5",
  blue: "#39699E",
};

export type Palette = { [K in keyof typeof colors]: string };
