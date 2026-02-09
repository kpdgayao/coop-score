import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  primary: "#1e293b",
  accent: "#0d9488",
  green: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  blue: "#2563eb",
  purple: "#7c3aed",
  muted: "#64748b",
  lightGray: "#f1f5f9",
  border: "#e2e8f0",
  white: "#ffffff",
};

export function getRiskHexColor(category: string): string {
  switch (category) {
    case "EXCELLENT":
      return colors.green;
    case "GOOD":
      return "#16a34a";
    case "FAIR":
      return colors.amber;
    case "MARGINAL":
      return "#ea580c";
    case "HIGH_RISK":
      return colors.red;
    default:
      return colors.muted;
  }
}

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: colors.primary,
  },
  // Header
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 12,
  },
  headerOrg: {
    fontSize: 8,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 9,
    color: colors.muted,
  },
  headerDate: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 4,
  },
  // Sections
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  // Info grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    marginBottom: 6,
    paddingRight: 10,
  },
  infoItemThird: {
    width: "33.33%",
    marginBottom: 6,
    paddingRight: 10,
  },
  infoLabel: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  // Tables
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.lightGray,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.muted,
    textTransform: "uppercase",
  },
  tableCell: {
    fontSize: 9,
  },
  // Score display
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 6,
  },
  scoreNumber: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
  },
  scoreLabel: {
    fontSize: 9,
    color: colors.muted,
  },
  // Badge-like
  badge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: "Helvetica-Bold",
  },
  // Recommendation banner
  recommendationBanner: {
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  // Lists
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bullet: {
    width: 12,
    fontSize: 9,
    color: colors.muted,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: colors.muted,
  },
  // Misc
  paragraph: {
    fontSize: 9,
    lineHeight: 1.5,
    color: colors.primary,
    marginBottom: 6,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
});
