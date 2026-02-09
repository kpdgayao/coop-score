import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ============================================================
// HELPERS
// ============================================================

function uuid(): string {
  return crypto.randomUUID();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randDecimal(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

/** Normal-ish distribution using Box-Muller */
function randNormal(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * stddev;
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatPhone(): string {
  return `09${randInt(10, 99)}${randInt(100, 999)}${randInt(1000, 9999)}`;
}

function randomDate(start: Date, end: Date): Date {
  const s = start.getTime();
  const e = end.getTime();
  return new Date(s + Math.random() * (e - s));
}

// ============================================================
// DATA POOLS
// ============================================================

const MALE_FIRST = [
  "Juan", "Pedro", "Jose", "Mario", "Roberto", "Ricardo", "Eduardo",
  "Fernando", "Antonio", "Miguel", "Rafael", "Carlos", "Francisco",
  "Ramon", "Manuel", "Danilo", "Ernesto", "Rolando", "Reynaldo",
  "Alfredo", "Ariel", "Joel", "Mark", "Christian", "James",
  "John Paul", "Kenneth", "Bryan", "Vincent", "Angelo",
];

const FEMALE_FIRST = [
  "Maria", "Ana", "Rosa", "Carmen", "Elena", "Teresa", "Gloria",
  "Patricia", "Jennifer", "Michelle", "Catherine", "Elizabeth",
  "Grace", "Faith", "Joy", "Lovely", "Princess", "April", "May",
  "Divine", "Cherry", "Ruby", "Emerald", "Jasmine", "Daisy",
  "Rowena", "Lorna", "Myrna", "Edna", "Nora",
];

const LAST_NAMES = [
  "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Garcia", "Mendoza",
  "Torres", "Villanueva", "Fernandez", "Dela Cruz", "Ramos", "Aquino",
  "Castro", "Rivera", "Flores", "Gonzales", "Hernandez", "Lopez",
  "Martinez", "Perez", "Rodriguez", "Sanchez", "Ramirez", "Diaz",
  "Morales", "Jimenez", "Romero", "Alvarez", "Navarro", "Lim", "Tan",
  "Go", "Uy", "Chua", "Ang", "Sy", "Tiu", "Yu", "Co",
];

const MIDDLE_NAMES = [
  "Aquino", "Bautista", "Cruz", "Dela Cruz", "Espinosa", "Fernandez",
  "Garcia", "Hernandez", "Ignacio", "Jimenez",
];

const BARANGAYS = [
  "Macasandig", "Lapasan", "Carmen", "Bulua", "Kauswagan", "Cugman",
  "Iponan", "Gusa", "Agusan", "Consolacion", "Nazareth", "Puerto",
  "Patag", "Balulang", "Lumbia", "Camaman-an", "Puntod", "Bonbon",
  "Bayabas", "Tablon", "Canitoan", "Tignapoloan", "Indahag", "Bugo",
  "Balubal", "Besigan", "Pagatpat",
];

const EMPLOYERS = [
  "Del Monte Philippines", "Oro Chamber of Commerce", "Xavier University",
  "CDO City Hall", "Landers Superstore", "SM CDO Downtown",
  "JR Borja Memorial Hospital", "Northern Mindanao Medical Center",
  "DOLE Philippines", "Capitol University", "Limketkai Center",
  "Centrio Mall", "PHIVIDEC Industrial Estate", "BDO CDO Branch",
  "Mindanao Sanitarium", "CDO Water District",
];

const SELF_EMPLOYED_BUSINESSES = [
  "Sari-sari Store", "Carenderia", "Tricycle Operator", "Habal-habal Driver",
  "Street Food Vendor", "Ukay-ukay Seller", "Market Vendor",
  "Freelance Carpenter", "Laundry Service", "Beauty Salon",
  "Barbershop", "Mobile Phone Repair", "Vulcanizing Shop",
];

const BUSINESS_NAMES = [
  "JM Trading", "CDO Fresh Seafoods", "Mindanao Auto Parts",
  "Golden Harvest Rice Mill", "Bukidnon Vegetables Supply",
  "Kagay-an Bakeshop", "Oro Hardware & Construction",
  "Cagayan Printing Services", "Macajalar Bay Fisheries",
  "Northern Mindanao Feeds",
];

const LOAN_PURPOSES: Record<string, string[]> = {
  MICRO: [
    "Sari-sari store capital",
    "Tricycle for habal-habal business",
    "Buy cellphone for online selling",
    "Market stall rental deposit",
    "Street food cart business",
    "Ukay-ukay bale purchase",
    "Rice retailing capital",
    "Vegetable vending startup",
  ],
  REGULAR: [
    "Business expansion - sari-sari to mini grocery",
    "Multicab purchase for delivery service",
    "Computer shop business startup",
    "Lechon roasting business",
    "Rice trading capital",
    "Fishing boat and equipment",
    "Buy second-hand delivery van",
  ],
  EMERGENCY: [
    "Medical emergency expenses",
    "Hospitalization of family member",
    "House repair after typhoon",
    "Emergency dental surgery",
    "Funeral expenses for relative",
  ],
  EDUCATIONAL: [
    "Children's college tuition - XU",
    "College tuition fees - Capitol University",
    "Nursing school tuition",
    "Review materials for board exam",
    "Technical vocational training - TESDA",
    "Senior high school expenses",
    "Elementary school supplies and fees",
  ],
  LIVELIHOOD: [
    "Buy carabao for farming",
    "Rice farming inputs and fertilizer",
    "Corn farming capital",
    "Piggery startup",
    "Poultry farming expansion",
    "Fishing boat repair and nets",
    "Vegetable greenhouse construction",
  ],
  HOUSING: [
    "Home renovation - concrete walls",
    "Roof replacement - galvanized iron",
    "House extension - additional bedroom",
    "Toilet and bathroom construction",
    "Kitchen renovation",
  ],
};

const CIVIL_STATUSES = ["SINGLE", "MARRIED", "WIDOWED", "SEPARATED"] as const;
const CIVIL_STATUS_WEIGHTS = [25, 60, 8, 7];

const EMPLOYMENT_TYPES = ["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER", "FARMER", "UNEMPLOYED"] as const;
const EMPLOYMENT_WEIGHTS = [40, 25, 15, 15, 5];

// ============================================================
// MEMBER GENERATION
// ============================================================

interface MemberData {
  id: string;
  membershipNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date;
  gender: "MALE" | "FEMALE";
  civilStatus: "SINGLE" | "MARRIED" | "WIDOWED" | "SEPARATED";
  barangay: string;
  city: string;
  province: string;
  contactNumber: string;
  email: string | null;
  employmentType: "EMPLOYED" | "SELF_EMPLOYED" | "BUSINESS_OWNER" | "FARMER" | "UNEMPLOYED";
  employerOrBusiness: string | null;
  monthlyIncome: number;
  membershipDate: Date;
  membershipStatus: "ACTIVE" | "INACTIVE" | "TERMINATED";
  pmesCompletionDate: Date | null;
}

function generateMembers(count: number): MemberData[] {
  const members: MemberData[] = [];
  const usedNumbers = new Set<string>();

  for (let i = 0; i < count; i++) {
    const gender: "MALE" | "FEMALE" = Math.random() < 0.5 ? "MALE" : "FEMALE";
    const firstName = gender === "MALE" ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
    const lastName = pick(LAST_NAMES);
    const middleName = Math.random() < 0.85 ? pick(MIDDLE_NAMES) : null;

    // Age: normally distributed around 38, range 22-68
    let age = Math.round(randNormal(38, 10));
    age = Math.max(22, Math.min(68, age));
    const birthYear = 2024 - age;
    const dateOfBirth = new Date(birthYear, randInt(0, 11), randInt(1, 28));

    // Membership date: spread 2019-2024, clustered 2020-2023
    const membershipYear = weightedPick(
      [2019, 2020, 2021, 2022, 2023, 2024],
      [8, 20, 25, 25, 15, 7],
    );
    const membershipDate = new Date(
      membershipYear,
      randInt(0, 11),
      randInt(1, 28),
    );

    let membershipNumber: string;
    do {
      membershipNumber = `OIC-${String(membershipYear).slice(2)}${String(randInt(1, 9999)).padStart(4, "0")}`;
    } while (usedNumbers.has(membershipNumber));
    usedNumbers.add(membershipNumber);

    const civilStatus = weightedPick([...CIVIL_STATUSES], [...CIVIL_STATUS_WEIGHTS]);
    const employmentType = weightedPick([...EMPLOYMENT_TYPES], [...EMPLOYMENT_WEIGHTS]);

    let monthlyIncome: number;
    let employerOrBusiness: string | null = null;

    switch (employmentType) {
      case "EMPLOYED":
        monthlyIncome = randDecimal(12000, 35000);
        employerOrBusiness = pick(EMPLOYERS);
        break;
      case "SELF_EMPLOYED":
        monthlyIncome = randDecimal(8000, 30000);
        employerOrBusiness = pick(SELF_EMPLOYED_BUSINESSES);
        break;
      case "BUSINESS_OWNER":
        monthlyIncome = randDecimal(20000, 80000);
        employerOrBusiness = pick(BUSINESS_NAMES);
        break;
      case "FARMER":
        monthlyIncome = randDecimal(5000, 15000);
        employerOrBusiness = "Self - Farming";
        break;
      case "UNEMPLOYED":
        monthlyIncome = randDecimal(0, 5000);
        break;
    }

    const hasEmail = Math.random() < 0.4;
    const email = hasEmail
      ? `${firstName.toLowerCase().replace(/\s+/g, "")}.${lastName.toLowerCase().replace(/\s+/g, "")}${randInt(1, 99)}@gmail.com`
      : null;

    // PMES: 70% of members completed
    const pmesCompletionDate = Math.random() < 0.7
      ? randomDate(membershipDate, new Date("2024-06-30"))
      : null;

    // Membership status: 90% active, 7% inactive, 3% terminated
    const membershipStatus = weightedPick(
      ["ACTIVE", "INACTIVE", "TERMINATED"] as const,
      [90, 7, 3],
    );

    members.push({
      id: uuid(),
      membershipNumber,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      civilStatus,
      barangay: pick(BARANGAYS),
      city: "Cagayan de Oro",
      province: "Misamis Oriental",
      contactNumber: formatPhone(),
      email,
      employmentType,
      employerOrBusiness,
      monthlyIncome,
      membershipDate,
      membershipStatus,
      pmesCompletionDate,
    });
  }

  return members;
}

// ============================================================
// SHARE CAPITAL GENERATION
// ============================================================

interface ShareCapitalData {
  id: string;
  memberId: string;
  transactionDate: Date;
  transactionType: "CONTRIBUTION" | "WITHDRAWAL" | "DIVIDEND_REINVESTMENT" | "PATRONAGE_REINVESTMENT";
  amount: number;
  runningBalance: number;
  notes: string | null;
}

function generateShareCapital(members: MemberData[]): ShareCapitalData[] {
  const records: ShareCapitalData[] = [];

  for (const member of members) {
    let balance = 0;
    const startDate = new Date(member.membershipDate);
    const monthsOfMembership = Math.min(
      12,
      Math.floor(
        (new Date("2024-07-01").getTime() - startDate.getTime()) /
          (30 * 24 * 60 * 60 * 1000),
      ),
    );

    for (let m = 0; m < monthsOfMembership; m++) {
      const txDate = addMonths(startDate, m);
      if (txDate > new Date("2024-07-01")) break;

      // Monthly contribution
      const contribAmount = randDecimal(500, 5000);
      balance += contribAmount;
      records.push({
        id: uuid(),
        memberId: member.id,
        transactionDate: new Date(txDate.getFullYear(), txDate.getMonth(), randInt(1, 15)),
        transactionType: "CONTRIBUTION",
        amount: contribAmount,
        runningBalance: parseFloat(balance.toFixed(2)),
        notes: null,
      });

      // 10% chance of withdrawal mid-month
      if (Math.random() < 0.10 && balance > 1000) {
        const withdrawAmt = randDecimal(500, Math.min(balance * 0.3, 3000));
        balance -= withdrawAmt;
        records.push({
          id: uuid(),
          memberId: member.id,
          transactionDate: new Date(txDate.getFullYear(), txDate.getMonth(), randInt(16, 28)),
          transactionType: "WITHDRAWAL",
          amount: withdrawAmt,
          runningBalance: parseFloat(balance.toFixed(2)),
          notes: "Partial withdrawal",
        });
      }

      // Year-end dividend reinvestment (December)
      if (txDate.getMonth() === 11 && Math.random() < 0.6) {
        const dividendAmt = parseFloat((balance * randDecimal(0.02, 0.05)).toFixed(2));
        balance += dividendAmt;
        records.push({
          id: uuid(),
          memberId: member.id,
          transactionDate: new Date(txDate.getFullYear(), 11, 28),
          transactionType: "DIVIDEND_REINVESTMENT",
          amount: dividendAmt,
          runningBalance: parseFloat(balance.toFixed(2)),
          notes: `Year-end dividend ${txDate.getFullYear()}`,
        });
      }
    }
  }

  return records;
}

// ============================================================
// SAVINGS GENERATION
// ============================================================

interface SavingsData {
  id: string;
  memberId: string;
  accountType: "REGULAR" | "TIME_DEPOSIT" | "SPECIAL";
  transactionDate: Date;
  transactionType: "DEPOSIT" | "WITHDRAWAL" | "INTEREST_CREDIT";
  amount: number;
  runningBalance: number;
}

function generateSavings(members: MemberData[]): SavingsData[] {
  const records: SavingsData[] = [];
  const shuffled = [...members].sort(() => Math.random() - 0.5);

  // 150 members with REGULAR savings
  const regularMembers = shuffled.slice(0, 150);
  // 50 members with TIME_DEPOSIT
  const tdMembers = shuffled.slice(0, 50);
  // 30 members with SPECIAL savings
  const specialMembers = shuffled.slice(50, 80);

  function addSavingsTx(
    member: MemberData,
    accountType: "REGULAR" | "TIME_DEPOSIT" | "SPECIAL",
    months: number,
    minDeposit: number,
    maxDeposit: number,
  ) {
    let balance = 0;
    const startDate = new Date(
      Math.max(member.membershipDate.getTime(), new Date("2023-01-01").getTime()),
    );

    for (let m = 0; m < months; m++) {
      const txDate = addMonths(startDate, m);
      if (txDate > new Date("2024-07-01")) break;

      // Deposit
      const depositAmt = randDecimal(minDeposit, maxDeposit);
      balance += depositAmt;
      records.push({
        id: uuid(),
        memberId: member.id,
        accountType,
        transactionDate: new Date(txDate.getFullYear(), txDate.getMonth(), randInt(1, 10)),
        transactionType: "DEPOSIT",
        amount: depositAmt,
        runningBalance: parseFloat(balance.toFixed(2)),
      });

      // 15% chance of withdrawal for REGULAR
      if (accountType === "REGULAR" && Math.random() < 0.15 && balance > 500) {
        const wAmt = randDecimal(200, Math.min(balance * 0.4, 5000));
        balance -= wAmt;
        records.push({
          id: uuid(),
          memberId: member.id,
          accountType,
          transactionDate: new Date(txDate.getFullYear(), txDate.getMonth(), randInt(15, 28)),
          transactionType: "WITHDRAWAL",
          amount: wAmt,
          runningBalance: parseFloat(balance.toFixed(2)),
        });
      }

      // Quarterly interest credit
      if (m > 0 && m % 3 === 0) {
        const interestRate = accountType === "TIME_DEPOSIT" ? 0.015 : accountType === "SPECIAL" ? 0.01 : 0.005;
        const interest = parseFloat((balance * interestRate).toFixed(2));
        balance += interest;
        records.push({
          id: uuid(),
          memberId: member.id,
          accountType,
          transactionDate: new Date(txDate.getFullYear(), txDate.getMonth(), 28),
          transactionType: "INTEREST_CREDIT",
          amount: interest,
          runningBalance: parseFloat(balance.toFixed(2)),
        });
      }
    }
  }

  for (const m of regularMembers) addSavingsTx(m, "REGULAR", 12, 200, 10000);
  for (const m of tdMembers) addSavingsTx(m, "TIME_DEPOSIT", 6, 5000, 10000);
  for (const m of specialMembers) addSavingsTx(m, "SPECIAL", 8, 500, 5000);

  return records;
}

// ============================================================
// LOANS GENERATION
// ============================================================

interface LoanData {
  id: string;
  memberId: string;
  loanType: "MICRO" | "REGULAR" | "EMERGENCY" | "EDUCATIONAL" | "LIVELIHOOD" | "HOUSING";
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  applicationDate: Date;
  approvalDate: Date | null;
  releaseDate: Date | null;
  maturityDate: Date;
  status: "PENDING" | "APPROVED" | "RELEASED" | "CURRENT" | "PAID" | "DELINQUENT" | "DEFAULT" | "RESTRUCTURED";
  purpose: string;
  approvedById: string | null;
}

function generateLoans(
  members: MemberData[],
  creditOfficerId: string,
): LoanData[] {
  const loans: LoanData[] = [];

  const loanTypeCounts: { type: typeof EMPLOYMENT_TYPES[number] extends string ? string : string; count: number }[] = [
    { type: "MICRO", count: 30 },
    { type: "REGULAR", count: 20 },
    { type: "EMERGENCY", count: 10 },
    { type: "EDUCATIONAL", count: 8 },
    { type: "LIVELIHOOD", count: 7 },
    { type: "HOUSING", count: 5 },
  ];

  const statusDistribution: { status: string; count: number }[] = [
    { status: "PENDING", count: 10 },
    { status: "APPROVED", count: 5 },
    { status: "CURRENT", count: 15 },
    { status: "PAID", count: 25 },
    { status: "DELINQUENT", count: 10 },
    { status: "DEFAULT", count: 5 },
    { status: "RESTRUCTURED", count: 5 },
    { status: "RELEASED", count: 5 },
  ];

  // Flatten status distribution into array
  const statuses: string[] = [];
  for (const s of statusDistribution) {
    for (let i = 0; i < s.count; i++) statuses.push(s.status);
  }
  // Shuffle
  statuses.sort(() => Math.random() - 0.5);

  const amountRanges: Record<string, [number, number]> = {
    MICRO: [5000, 50000],
    REGULAR: [50000, 300000],
    EMERGENCY: [5000, 20000],
    EDUCATIONAL: [10000, 100000],
    LIVELIHOOD: [20000, 200000],
    HOUSING: [100000, 500000],
  };

  const termRanges: Record<string, [number, number]> = {
    MICRO: [3, 12],
    REGULAR: [12, 36],
    EMERGENCY: [3, 6],
    EDUCATIONAL: [12, 48],
    LIVELIHOOD: [12, 36],
    HOUSING: [24, 60],
  };

  // Build flat list of loan types matching counts
  const loanTypesList: string[] = [];
  for (const lt of loanTypeCounts) {
    for (let i = 0; i < lt.count; i++) loanTypesList.push(lt.type);
  }
  loanTypesList.sort(() => Math.random() - 0.5);

  // Pick 80 distinct members (or allow duplicates for realism)
  const activeMembers = members.filter((m) => m.membershipStatus === "ACTIVE");
  const loanMembers: MemberData[] = [];
  for (let i = 0; i < 80; i++) {
    loanMembers.push(pick(activeMembers));
  }

  for (let i = 0; i < 80; i++) {
    const member = loanMembers[i];
    const loanType = loanTypesList[i] as LoanData["loanType"];
    const status = statuses[i] as LoanData["status"];
    const [minAmt, maxAmt] = amountRanges[loanType];
    const [minTerm, maxTerm] = termRanges[loanType];
    const principal = randDecimal(minAmt, maxAmt, 0);
    const interestRate = randDecimal(0.01, 0.03, 4);
    const termMonths = randInt(minTerm, maxTerm);

    // Application date: random in past 2 years
    const applicationDate = randomDate(
      new Date("2022-06-01"),
      new Date("2024-06-01"),
    );

    let approvalDate: Date | null = null;
    let releaseDate: Date | null = null;
    const maturityDate = addMonths(applicationDate, termMonths + 1);

    const needsApproval = status !== "PENDING";
    if (needsApproval) {
      approvalDate = addDays(applicationDate, randInt(2, 14));
    }

    const needsRelease = !["PENDING", "APPROVED"].includes(status);
    if (needsRelease && approvalDate) {
      releaseDate = addDays(approvalDate, randInt(1, 7));
    }

    loans.push({
      id: uuid(),
      memberId: member.id,
      loanType,
      principalAmount: principal,
      interestRate,
      termMonths,
      applicationDate,
      approvalDate,
      releaseDate,
      maturityDate,
      status,
      purpose: pick(LOAN_PURPOSES[loanType]),
      approvedById: needsApproval ? creditOfficerId : null,
    });
  }

  return loans;
}

// ============================================================
// LOAN PAYMENTS GENERATION
// ============================================================

interface PaymentData {
  id: string;
  loanId: string;
  dueDate: Date;
  paymentDate: Date | null;
  amountDue: number;
  amountPaid: number;
  principal: number;
  interest: number;
  penalty: number;
  status: "ON_TIME" | "LATE" | "MISSED" | "PARTIAL";
}

function generatePayments(loans: LoanData[]): PaymentData[] {
  const payments: PaymentData[] = [];
  const payableStatuses = ["CURRENT", "PAID", "DELINQUENT", "DEFAULT", "RESTRUCTURED", "RELEASED"];

  for (const loan of loans) {
    if (!payableStatuses.includes(loan.status)) continue;
    if (!loan.releaseDate) continue;

    const monthlyInterest = loan.principalAmount * Number(loan.interestRate);
    const monthlyPrincipal = loan.principalAmount / loan.termMonths;
    const monthlyDue = parseFloat((monthlyPrincipal + monthlyInterest).toFixed(2));

    // Determine how many payments to generate
    let paymentCount = loan.termMonths;
    if (loan.status === "CURRENT") {
      // Payments up to "now" (July 2024)
      const monthsSinceRelease = Math.floor(
        (new Date("2024-07-01").getTime() - loan.releaseDate.getTime()) /
          (30 * 24 * 60 * 60 * 1000),
      );
      paymentCount = Math.min(paymentCount, Math.max(1, monthsSinceRelease));
    } else if (loan.status === "DELINQUENT") {
      const monthsSinceRelease = Math.floor(
        (new Date("2024-07-01").getTime() - loan.releaseDate.getTime()) /
          (30 * 24 * 60 * 60 * 1000),
      );
      paymentCount = Math.min(paymentCount, Math.max(1, monthsSinceRelease));
    } else if (loan.status === "DEFAULT") {
      // Stopped paying after a while
      paymentCount = Math.min(paymentCount, randInt(3, 8));
    }

    for (let p = 0; p < paymentCount; p++) {
      const dueDate = addMonths(loan.releaseDate, p + 1);
      if (dueDate > new Date("2024-07-15")) break;

      let status: PaymentData["status"];
      let paymentDate: Date | null = null;
      let amountPaid: number;
      let penalty = 0;

      switch (loan.status) {
        case "PAID":
          // Mostly on time
          status = Math.random() < 0.85 ? "ON_TIME" : "LATE";
          paymentDate = status === "ON_TIME"
            ? addDays(dueDate, randInt(-3, 0))
            : addDays(dueDate, randInt(1, 15));
          amountPaid = monthlyDue;
          if (status === "LATE") penalty = parseFloat((monthlyDue * 0.02).toFixed(2));
          break;

        case "CURRENT":
          // Mostly on time, a few late
          if (Math.random() < 0.80) {
            status = "ON_TIME";
            paymentDate = addDays(dueDate, randInt(-3, 0));
            amountPaid = monthlyDue;
          } else {
            status = "LATE";
            paymentDate = addDays(dueDate, randInt(1, 20));
            amountPaid = monthlyDue;
            penalty = parseFloat((monthlyDue * 0.02).toFixed(2));
          }
          break;

        case "DELINQUENT":
          // Mix of late, missed, partial
          if (p < paymentCount - 3) {
            // Earlier payments were OK
            status = Math.random() < 0.6 ? "ON_TIME" : "LATE";
            paymentDate = status === "ON_TIME"
              ? addDays(dueDate, randInt(-2, 0))
              : addDays(dueDate, randInt(5, 25));
            amountPaid = monthlyDue;
            if (status === "LATE") penalty = parseFloat((monthlyDue * 0.03).toFixed(2));
          } else {
            // Recent payments are problematic
            const roll = Math.random();
            if (roll < 0.4) {
              status = "MISSED";
              paymentDate = null;
              amountPaid = 0;
              penalty = parseFloat((monthlyDue * 0.05).toFixed(2));
            } else if (roll < 0.7) {
              status = "LATE";
              paymentDate = addDays(dueDate, randInt(10, 30));
              amountPaid = monthlyDue;
              penalty = parseFloat((monthlyDue * 0.03).toFixed(2));
            } else {
              status = "PARTIAL";
              paymentDate = addDays(dueDate, randInt(5, 20));
              amountPaid = parseFloat((monthlyDue * randDecimal(0.3, 0.7)).toFixed(2));
              penalty = parseFloat((monthlyDue * 0.03).toFixed(2));
            }
          }
          break;

        case "DEFAULT":
          // Many missed
          if (p < 2) {
            status = Math.random() < 0.5 ? "ON_TIME" : "LATE";
            paymentDate = status === "ON_TIME"
              ? addDays(dueDate, randInt(-2, 0))
              : addDays(dueDate, randInt(5, 20));
            amountPaid = monthlyDue;
          } else {
            status = Math.random() < 0.7 ? "MISSED" : "PARTIAL";
            paymentDate = status === "PARTIAL"
              ? addDays(dueDate, randInt(10, 30))
              : null;
            amountPaid = status === "PARTIAL"
              ? parseFloat((monthlyDue * randDecimal(0.2, 0.5)).toFixed(2))
              : 0;
            penalty = parseFloat((monthlyDue * 0.05).toFixed(2));
          }
          break;

        default:
          // RESTRUCTURED, RELEASED
          status = Math.random() < 0.7 ? "ON_TIME" : "LATE";
          paymentDate = status === "ON_TIME"
            ? addDays(dueDate, randInt(-3, 0))
            : addDays(dueDate, randInt(1, 15));
          amountPaid = monthlyDue;
          if (status === "LATE") penalty = parseFloat((monthlyDue * 0.02).toFixed(2));
          break;
      }

      payments.push({
        id: uuid(),
        loanId: loan.id,
        dueDate,
        paymentDate,
        amountDue: monthlyDue,
        amountPaid: parseFloat(amountPaid.toFixed(2)),
        principal: parseFloat(monthlyPrincipal.toFixed(2)),
        interest: parseFloat(monthlyInterest.toFixed(2)),
        penalty,
        status,
      });
    }
  }

  return payments;
}

// ============================================================
// GUARANTORS GENERATION
// ============================================================

interface GuarantorData {
  id: string;
  loanId: string;
  guarantorMemberId: string;
  guaranteedAmount: number;
  status: "ACTIVE" | "CALLED" | "RELEASED";
}

function generateGuarantors(
  loans: LoanData[],
  members: MemberData[],
): GuarantorData[] {
  const guarantors: GuarantorData[] = [];
  const usedPairs = new Set<string>();
  const activeMemberIds = members
    .filter((m) => m.membershipStatus === "ACTIVE")
    .map((m) => m.id);

  for (const loan of loans) {
    if (loan.status === "PENDING") continue;

    const numGuarantors = Math.random() < 0.7 ? 2 : 1;

    for (let g = 0; g < numGuarantors; g++) {
      if (guarantors.length >= 100) break;

      // Find a guarantor that is not the borrower and not already guaranteeing this loan
      let guarantorId: string;
      let attempts = 0;
      do {
        guarantorId = pick(activeMemberIds);
        attempts++;
      } while (
        (guarantorId === loan.memberId ||
          usedPairs.has(`${loan.id}-${guarantorId}`)) &&
        attempts < 20
      );

      if (attempts >= 20) continue;

      usedPairs.add(`${loan.id}-${guarantorId}`);

      let status: GuarantorData["status"] = "ACTIVE";
      if (loan.status === "PAID") status = "RELEASED";
      else if (loan.status === "DEFAULT") status = Math.random() < 0.5 ? "CALLED" : "ACTIVE";

      guarantors.push({
        id: uuid(),
        loanId: loan.id,
        guarantorMemberId: guarantorId,
        guaranteedAmount: parseFloat((loan.principalAmount * 0.5).toFixed(2)),
        status,
      });
    }

    if (guarantors.length >= 100) break;
  }

  return guarantors;
}

// ============================================================
// COOPERATIVE ACTIVITIES
// ============================================================

interface ActivityData {
  id: string;
  activityType: "GENERAL_ASSEMBLY" | "TRAINING" | "SEMINAR" | "COMMITTEE_MEETING" | "COMMUNITY_SERVICE" | "VOLUNTEER" | "ELECTION";
  title: string;
  date: Date;
  cetfFunded: boolean;
  category: "FINANCIAL_LITERACY" | "GOVERNANCE" | "LIVELIHOOD" | "COOPERATIVE_PRINCIPLES" | "OTHER";
}

function generateActivities(): ActivityData[] {
  const activities: ActivityData[] = [];

  // 4 General Assemblies
  activities.push({
    id: uuid(),
    activityType: "GENERAL_ASSEMBLY",
    title: "53rd Annual General Assembly",
    date: new Date("2023-03-18"),
    cetfFunded: false,
    category: "GOVERNANCE",
  });
  activities.push({
    id: uuid(),
    activityType: "GENERAL_ASSEMBLY",
    title: "54th Annual General Assembly",
    date: new Date("2024-03-16"),
    cetfFunded: false,
    category: "GOVERNANCE",
  });
  activities.push({
    id: uuid(),
    activityType: "GENERAL_ASSEMBLY",
    title: "Special General Assembly - Bylaw Amendments",
    date: new Date("2023-09-09"),
    cetfFunded: false,
    category: "GOVERNANCE",
  });
  activities.push({
    id: uuid(),
    activityType: "GENERAL_ASSEMBLY",
    title: "Special General Assembly - Strategic Planning",
    date: new Date("2024-01-20"),
    cetfFunded: false,
    category: "GOVERNANCE",
  });

  // 8 Trainings
  const trainingTopics = [
    { title: "Financial Literacy Seminar - Basic Budgeting", cat: "FINANCIAL_LITERACY" as const },
    { title: "Leadership Training for Committee Chairs", cat: "GOVERNANCE" as const },
    { title: "Cooperative Governance and Management Training", cat: "GOVERNANCE" as const },
    { title: "Bookkeeping and Record Keeping Workshop", cat: "FINANCIAL_LITERACY" as const },
    { title: "Gender and Development (GAD) Training", cat: "OTHER" as const },
    { title: "PMES Training - Pre-Membership Education Seminar", cat: "COOPERATIVE_PRINCIPLES" as const },
    { title: "Disaster Preparedness and Risk Management", cat: "OTHER" as const },
    { title: "Digital Literacy for Cooperative Members", cat: "FINANCIAL_LITERACY" as const },
  ];

  for (let i = 0; i < trainingTopics.length; i++) {
    activities.push({
      id: uuid(),
      activityType: "TRAINING",
      title: trainingTopics[i].title,
      date: randomDate(new Date("2023-01-01"), new Date("2024-06-30")),
      cetfFunded: Math.random() < 0.6,
      category: trainingTopics[i].cat,
    });
  }

  // 5 Seminars
  const seminarTopics = [
    { title: "Livelihood Skills - Organic Farming Techniques", cat: "LIVELIHOOD" as const },
    { title: "Savings and Investment Planning Seminar", cat: "FINANCIAL_LITERACY" as const },
    { title: "Understanding Cooperative Principles and Values", cat: "COOPERATIVE_PRINCIPLES" as const },
    { title: "Micro-Enterprise Development Seminar", cat: "LIVELIHOOD" as const },
    { title: "Tax Compliance for Small Business Owners", cat: "FINANCIAL_LITERACY" as const },
  ];

  for (const s of seminarTopics) {
    activities.push({
      id: uuid(),
      activityType: "SEMINAR",
      title: s.title,
      date: randomDate(new Date("2023-04-01"), new Date("2024-06-30")),
      cetfFunded: Math.random() < 0.5,
      category: s.cat,
    });
  }

  // 4 Committee Meetings
  const committeeMeetings = [
    "Board of Directors Quarterly Meeting - Q1 2024",
    "Credit Committee Monthly Review - January 2024",
    "Audit Committee Year-End Review 2023",
    "Education Committee Planning Meeting 2024",
  ];

  for (const title of committeeMeetings) {
    activities.push({
      id: uuid(),
      activityType: "COMMITTEE_MEETING",
      title,
      date: randomDate(new Date("2023-06-01"), new Date("2024-06-30")),
      cetfFunded: false,
      category: "GOVERNANCE",
    });
  }

  // 2 Community Service
  activities.push({
    id: uuid(),
    activityType: "COMMUNITY_SERVICE",
    title: "Barangay Clean-up Drive - Macasandig",
    date: new Date("2023-10-14"),
    cetfFunded: true,
    category: "OTHER",
  });
  activities.push({
    id: uuid(),
    activityType: "COMMUNITY_SERVICE",
    title: "Tree Planting Activity - Cugman Watershed",
    date: new Date("2024-06-08"),
    cetfFunded: true,
    category: "OTHER",
  });

  // 1 Volunteer
  activities.push({
    id: uuid(),
    activityType: "VOLUNTEER",
    title: "Typhoon Relief Packing and Distribution",
    date: new Date("2023-12-20"),
    cetfFunded: false,
    category: "OTHER",
  });

  // 1 Election
  activities.push({
    id: uuid(),
    activityType: "ELECTION",
    title: "Board of Directors Election 2024",
    date: new Date("2024-03-16"),
    cetfFunded: false,
    category: "GOVERNANCE",
  });

  return activities;
}

// ============================================================
// ATTENDANCE GENERATION
// ============================================================

interface AttendanceData {
  id: string;
  activityId: string;
  memberId: string;
  attended: boolean;
}

function generateAttendance(
  activities: ActivityData[],
  members: MemberData[],
): AttendanceData[] {
  const records: AttendanceData[] = [];
  const activeMembers = members.filter((m) => m.membershipStatus === "ACTIVE");

  for (const activity of activities) {
    // GA: 40-80% attendance, others: 10-30%
    const isGA = activity.activityType === "GENERAL_ASSEMBLY";
    const isElection = activity.activityType === "ELECTION";
    const attendanceRate = isGA || isElection
      ? randDecimal(0.4, 0.8)
      : randDecimal(0.1, 0.3);

    const attendeeCount = Math.floor(activeMembers.length * attendanceRate);
    const attendees = new Set(
      pickN(activeMembers, attendeeCount).map((m) => m.id),
    );

    for (const mid of attendees) {
      records.push({
        id: uuid(),
        activityId: activity.id,
        memberId: mid,
        attended: true,
      });
    }
  }

  return records;
}

// ============================================================
// COMMITTEE SERVICE
// ============================================================

interface CommitteeServiceData {
  id: string;
  memberId: string;
  committeeName: string;
  role: "MEMBER" | "SECRETARY" | "VICE_CHAIR" | "CHAIR";
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}

function generateCommitteeService(members: MemberData[]): CommitteeServiceData[] {
  const records: CommitteeServiceData[] = [];
  const activeMembers = members.filter((m) => m.membershipStatus === "ACTIVE");
  const selected = pickN(activeMembers, 30);

  const committees = [
    "Board of Directors",
    "Credit Committee",
    "Audit Committee",
    "Election Committee",
    "Education Committee",
    "Mediation Committee",
  ];

  const roles: CommitteeServiceData["role"][] = ["CHAIR", "VICE_CHAIR", "SECRETARY", "MEMBER", "MEMBER", "MEMBER"];

  let roleIdx = 0;
  for (const committee of committees) {
    const committeeMembers = selected.splice(0, 5);
    for (const m of committeeMembers) {
      const role = roles[roleIdx % roles.length];
      roleIdx++;
      const startDate = randomDate(new Date("2022-03-01"), new Date("2024-03-30"));
      const isActive = Math.random() < 0.8;

      records.push({
        id: uuid(),
        memberId: m.id,
        committeeName: committee,
        role,
        startDate,
        endDate: isActive ? null : addMonths(startDate, randInt(6, 18)),
        isActive,
      });
    }
  }

  return records;
}

// ============================================================
// MEMBER REFERRALS
// ============================================================

interface ReferralData {
  id: string;
  referrerId: string;
  referredMemberId: string;
  referralDate: Date;
}

function generateReferrals(members: MemberData[]): ReferralData[] {
  const records: ReferralData[] = [];
  const usedPairs = new Set<string>();

  // Sort members by membership date so referrers are older members
  const sorted = [...members].sort(
    (a, b) => a.membershipDate.getTime() - b.membershipDate.getTime(),
  );

  let count = 0;
  while (count < 40) {
    // Referrer from first half (older members), referred from second half (newer)
    const referrer = sorted[randInt(0, Math.floor(sorted.length / 2))];
    const referred = sorted[randInt(Math.floor(sorted.length / 2), sorted.length - 1)];

    if (referrer.id === referred.id) continue;
    const key = `${referrer.id}-${referred.id}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);

    records.push({
      id: uuid(),
      referrerId: referrer.id,
      referredMemberId: referred.id,
      referralDate: referred.membershipDate,
    });
    count++;
  }

  return records;
}

// ============================================================
// COOP SERVICE USAGE
// ============================================================

interface ServiceUsageData {
  id: string;
  memberId: string;
  serviceType: "STORE" | "INSURANCE" | "RICE_SUBSIDY" | "MEDICAL" | "FUNERAL" | "CALAMITY";
  transactionDate: Date;
  amount: number;
}

function generateServiceUsage(members: MemberData[]): ServiceUsageData[] {
  const records: ServiceUsageData[] = [];
  const activeMembers = members.filter((m) => m.membershipStatus === "ACTIVE");
  const serviceTypes: ServiceUsageData["serviceType"][] = [
    "STORE", "STORE", "STORE", "STORE",
    "INSURANCE", "INSURANCE",
    "RICE_SUBSIDY", "RICE_SUBSIDY",
    "MEDICAL",
    "FUNERAL",
    "CALAMITY",
  ];

  for (let i = 0; i < 100; i++) {
    const member = pick(activeMembers);
    const serviceType = pick(serviceTypes);

    let amount: number;
    switch (serviceType) {
      case "STORE":
        amount = randDecimal(100, 5000);
        break;
      case "INSURANCE":
        amount = randDecimal(500, 3000);
        break;
      case "RICE_SUBSIDY":
        amount = randDecimal(500, 2000);
        break;
      case "MEDICAL":
        amount = randDecimal(1000, 10000);
        break;
      case "FUNERAL":
        amount = randDecimal(5000, 20000);
        break;
      case "CALAMITY":
        amount = randDecimal(2000, 15000);
        break;
    }

    records.push({
      id: uuid(),
      memberId: member.id,
      serviceType,
      transactionDate: randomDate(new Date("2023-01-01"), new Date("2024-06-30")),
      amount,
    });
  }

  return records;
}

// ============================================================
// CREDIT SCORES
// ============================================================

interface CreditScoreData {
  id: string;
  memberId: string;
  scoreDate: Date;
  totalScore: number;
  riskCategory: "EXCELLENT" | "GOOD" | "FAIR" | "MARGINAL" | "HIGH_RISK";
  scoringPathway: "STANDARD" | "THIN_FILE";
  dimensionScores: object;
  recommendations: object | null;
  computedBy: "SYSTEM" | "MANUAL_OVERRIDE";
  modelVersion: string;
}

function getRiskCategory(score: number): CreditScoreData["riskCategory"] {
  if (score >= 750) return "EXCELLENT";
  if (score >= 650) return "GOOD";
  if (score >= 550) return "FAIR";
  if (score >= 450) return "MARGINAL";
  return "HIGH_RISK";
}

function generateCreditScores(members: MemberData[]): CreditScoreData[] {
  const records: CreditScoreData[] = [];
  const scoredMembers = pickN(
    members.filter((m) => m.membershipStatus === "ACTIVE"),
    150,
  );

  for (const member of scoredMembers) {
    const totalScore = Math.round(
      Math.max(350, Math.min(820, randNormal(620, 100))),
    );
    const riskCategory = getRiskCategory(totalScore);

    // Determine pathway: newer members more likely thin file
    const membershipYears =
      (new Date("2024-07-01").getTime() - member.membershipDate.getTime()) /
      (365 * 24 * 60 * 60 * 1000);
    const scoringPathway: CreditScoreData["scoringPathway"] =
      membershipYears < 1.5 ? "THIN_FILE" : "STANDARD";

    // Build realistic dimension scores that roughly add up
    const repaymentScore = Math.round(randNormal(totalScore * 0.25 / 820 * 250, 20));
    const capitalBuildUp = Math.round(randNormal(totalScore * 0.20 / 820 * 200, 15));
    const savingsStability = Math.round(randNormal(totalScore * 0.15 / 820 * 150, 10));
    const coopEngagement = Math.round(randNormal(totalScore * 0.15 / 820 * 150, 10));
    const memberTenure = Math.round(randNormal(totalScore * 0.10 / 820 * 100, 8));
    const characterRef = Math.round(randNormal(totalScore * 0.15 / 820 * 150, 10));

    const dimensionScores = {
      repaymentHistory: {
        score: Math.max(0, Math.min(250, repaymentScore)),
        maxScore: 250,
        weight: 0.25,
        details: "Based on loan repayment patterns and timeliness",
      },
      capitalBuildUp: {
        score: Math.max(0, Math.min(200, capitalBuildUp)),
        maxScore: 200,
        weight: 0.20,
        details: "Share capital contribution consistency and growth",
      },
      savingsStability: {
        score: Math.max(0, Math.min(150, savingsStability)),
        maxScore: 150,
        weight: 0.15,
        details: "Savings deposit regularity and balance trends",
      },
      cooperativeEngagement: {
        score: Math.max(0, Math.min(150, coopEngagement)),
        maxScore: 150,
        weight: 0.15,
        details: "Activity attendance and committee participation",
      },
      memberTenure: {
        score: Math.max(0, Math.min(100, memberTenure)),
        maxScore: 100,
        weight: 0.10,
        details: "Length and consistency of membership",
      },
      characterReference: {
        score: Math.max(0, Math.min(150, characterRef)),
        maxScore: 150,
        weight: 0.15,
        details: "Guarantor relationships and peer standing",
      },
    };

    const recommendations =
      totalScore < 550
        ? {
            items: [
              "Improve loan repayment timeliness",
              "Increase share capital contributions",
              "Attend more cooperative activities",
            ],
          }
        : totalScore < 700
          ? {
              items: [
                "Consider increasing monthly savings deposits",
                "Participate in committee service for engagement score",
              ],
            }
          : null;

    records.push({
      id: uuid(),
      memberId: member.id,
      scoreDate: new Date("2024-07-01"),
      totalScore,
      riskCategory,
      scoringPathway,
      dimensionScores,
      recommendations,
      computedBy: Math.random() < 0.95 ? "SYSTEM" : "MANUAL_OVERRIDE",
      modelVersion: "1.0",
    });
  }

  return records;
}

// ============================================================
// MAIN SEED
// ============================================================

async function main() {
  console.log("Seeding CoopScore database for Oro Integrated Cooperative...\n");

  // ---- CLEAR ALL TABLES (reverse dependency order) ----
  console.log("Clearing existing data...");
  await prisma.aIApiLog.deleteMany();
  await prisma.loanInterview.deleteMany();
  await prisma.anomalyAlert.deleteMany();
  await prisma.creditScore.deleteMany();
  await prisma.coopServiceUsage.deleteMany();
  await prisma.memberReferral.deleteMany();
  await prisma.committeeService.deleteMany();
  await prisma.activityAttendance.deleteMany();
  await prisma.coopActivity.deleteMany();
  await prisma.guarantor.deleteMany();
  await prisma.loanPayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.savingsTransaction.deleteMany();
  await prisma.shareCapital.deleteMany();
  await prisma.member.deleteMany();
  await prisma.user.deleteMany();
  console.log("All tables cleared.\n");

  // ---- USERS ----
  console.log("Creating users...");
  const adminId = uuid();
  const creditOfficerId = uuid();
  const memberViewerId = uuid();

  // bcrypt hash placeholder for "password123"
  const hashedPassword = "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zQvHxFs.MhqF6JOqzKvTq";

  await prisma.user.createMany({
    data: [
      {
        id: adminId,
        email: "admin@oic.coop",
        name: "Admin User",
        hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
      {
        id: creditOfficerId,
        email: "credit@oic.coop",
        name: "Maria Santos",
        hashedPassword,
        role: "CREDIT_OFFICER",
        isActive: true,
      },
      {
        id: memberViewerId,
        email: "member@oic.coop",
        name: "Juan Dela Cruz",
        hashedPassword,
        role: "MEMBER",
        isActive: true,
      },
    ],
  });
  console.log("  3 users created.\n");

  // ---- MEMBERS ----
  console.log("Creating 200 members...");
  const members = generateMembers(200);
  await prisma.member.createMany({
    data: members.map((m) => ({
      id: m.id,
      membershipNumber: m.membershipNumber,
      firstName: m.firstName,
      middleName: m.middleName,
      lastName: m.lastName,
      dateOfBirth: m.dateOfBirth,
      gender: m.gender,
      civilStatus: m.civilStatus,
      barangay: m.barangay,
      city: m.city,
      province: m.province,
      contactNumber: m.contactNumber,
      email: m.email,
      employmentType: m.employmentType,
      employerOrBusiness: m.employerOrBusiness,
      monthlyIncome: m.monthlyIncome,
      membershipDate: m.membershipDate,
      membershipStatus: m.membershipStatus,
      pmesCompletionDate: m.pmesCompletionDate,
    })),
  });
  console.log(`  ${members.length} members created.\n`);

  // ---- SHARE CAPITAL ----
  console.log("Creating share capital transactions...");
  const shareCapital = generateShareCapital(members);
  // Batch insert in chunks of 500
  for (let i = 0; i < shareCapital.length; i += 500) {
    const chunk = shareCapital.slice(i, i + 500);
    await prisma.shareCapital.createMany({
      data: chunk.map((sc) => ({
        id: sc.id,
        memberId: sc.memberId,
        transactionDate: sc.transactionDate,
        transactionType: sc.transactionType,
        amount: sc.amount,
        runningBalance: sc.runningBalance,
        notes: sc.notes,
      })),
    });
  }
  console.log(`  ${shareCapital.length} share capital transactions created.\n`);

  // ---- SAVINGS ----
  console.log("Creating savings transactions...");
  const savings = generateSavings(members);
  for (let i = 0; i < savings.length; i += 500) {
    const chunk = savings.slice(i, i + 500);
    await prisma.savingsTransaction.createMany({
      data: chunk.map((s) => ({
        id: s.id,
        memberId: s.memberId,
        accountType: s.accountType,
        transactionDate: s.transactionDate,
        transactionType: s.transactionType,
        amount: s.amount,
        runningBalance: s.runningBalance,
      })),
    });
  }
  console.log(`  ${savings.length} savings transactions created.\n`);

  // ---- LOANS ----
  console.log("Creating loans...");
  const loans = generateLoans(members, creditOfficerId);
  await prisma.loan.createMany({
    data: loans.map((l) => ({
      id: l.id,
      memberId: l.memberId,
      loanType: l.loanType,
      principalAmount: l.principalAmount,
      interestRate: l.interestRate,
      termMonths: l.termMonths,
      applicationDate: l.applicationDate,
      approvalDate: l.approvalDate,
      releaseDate: l.releaseDate,
      maturityDate: l.maturityDate,
      status: l.status,
      purpose: l.purpose,
      approvedById: l.approvedById,
    })),
  });
  console.log(`  ${loans.length} loans created.\n`);

  // ---- LOAN PAYMENTS ----
  console.log("Creating loan payments...");
  const payments = generatePayments(loans);
  for (let i = 0; i < payments.length; i += 500) {
    const chunk = payments.slice(i, i + 500);
    await prisma.loanPayment.createMany({
      data: chunk.map((p) => ({
        id: p.id,
        loanId: p.loanId,
        dueDate: p.dueDate,
        paymentDate: p.paymentDate,
        amountDue: p.amountDue,
        amountPaid: p.amountPaid,
        principal: p.principal,
        interest: p.interest,
        penalty: p.penalty,
        status: p.status,
      })),
    });
  }
  console.log(`  ${payments.length} loan payments created.\n`);

  // ---- GUARANTORS ----
  console.log("Creating guarantors...");
  const guarantors = generateGuarantors(loans, members);
  await prisma.guarantor.createMany({
    data: guarantors.map((g) => ({
      id: g.id,
      loanId: g.loanId,
      guarantorMemberId: g.guarantorMemberId,
      guaranteedAmount: g.guaranteedAmount,
      status: g.status,
    })),
  });
  console.log(`  ${guarantors.length} guarantors created.\n`);

  // ---- COOPERATIVE ACTIVITIES ----
  console.log("Creating cooperative activities...");
  const activities = generateActivities();
  await prisma.coopActivity.createMany({
    data: activities.map((a) => ({
      id: a.id,
      activityType: a.activityType,
      title: a.title,
      date: a.date,
      cetfFunded: a.cetfFunded,
      category: a.category,
    })),
  });
  console.log(`  ${activities.length} activities created.\n`);

  // ---- ACTIVITY ATTENDANCE ----
  console.log("Creating activity attendance records...");
  const attendance = generateAttendance(activities, members);
  for (let i = 0; i < attendance.length; i += 500) {
    const chunk = attendance.slice(i, i + 500);
    await prisma.activityAttendance.createMany({
      data: chunk.map((a) => ({
        id: a.id,
        activityId: a.activityId,
        memberId: a.memberId,
        attended: a.attended,
      })),
    });
  }
  console.log(`  ${attendance.length} attendance records created.\n`);

  // ---- COMMITTEE SERVICE ----
  console.log("Creating committee service records...");
  const committeeService = generateCommitteeService(members);
  await prisma.committeeService.createMany({
    data: committeeService.map((cs) => ({
      id: cs.id,
      memberId: cs.memberId,
      committeeName: cs.committeeName,
      role: cs.role,
      startDate: cs.startDate,
      endDate: cs.endDate,
      isActive: cs.isActive,
    })),
  });
  console.log(`  ${committeeService.length} committee service records created.\n`);

  // ---- MEMBER REFERRALS ----
  console.log("Creating member referrals...");
  const referrals = generateReferrals(members);
  await prisma.memberReferral.createMany({
    data: referrals.map((r) => ({
      id: r.id,
      referrerId: r.referrerId,
      referredMemberId: r.referredMemberId,
      referralDate: r.referralDate,
    })),
  });
  console.log(`  ${referrals.length} referrals created.\n`);

  // ---- COOP SERVICE USAGE ----
  console.log("Creating coop service usage records...");
  const serviceUsage = generateServiceUsage(members);
  await prisma.coopServiceUsage.createMany({
    data: serviceUsage.map((su) => ({
      id: su.id,
      memberId: su.memberId,
      serviceType: su.serviceType,
      transactionDate: su.transactionDate,
      amount: su.amount,
    })),
  });
  console.log(`  ${serviceUsage.length} service usage records created.\n`);

  // ---- CREDIT SCORES ----
  console.log("Creating credit scores...");
  const creditScores = generateCreditScores(members);
  await prisma.creditScore.createMany({
    data: creditScores.map((cs) => ({
      id: cs.id,
      memberId: cs.memberId,
      scoreDate: cs.scoreDate,
      totalScore: cs.totalScore,
      riskCategory: cs.riskCategory,
      scoringPathway: cs.scoringPathway,
      dimensionScores: cs.dimensionScores,
      recommendations: cs.recommendations ?? undefined,
      computedBy: cs.computedBy,
      modelVersion: cs.modelVersion,
    })),
  });
  console.log(`  ${creditScores.length} credit scores created.\n`);

  // ---- SUMMARY ----
  console.log("========================================");
  console.log("Seed completed successfully!");
  console.log("========================================");
  console.log(`  Users:                ${3}`);
  console.log(`  Members:              ${members.length}`);
  console.log(`  Share Capital Txns:   ${shareCapital.length}`);
  console.log(`  Savings Txns:         ${savings.length}`);
  console.log(`  Loans:                ${loans.length}`);
  console.log(`  Loan Payments:        ${payments.length}`);
  console.log(`  Guarantors:           ${guarantors.length}`);
  console.log(`  Activities:           ${activities.length}`);
  console.log(`  Attendance Records:   ${attendance.length}`);
  console.log(`  Committee Service:    ${committeeService.length}`);
  console.log(`  Referrals:            ${referrals.length}`);
  console.log(`  Service Usage:        ${serviceUsage.length}`);
  console.log(`  Credit Scores:        ${creditScores.length}`);
  console.log("========================================\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
