import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const CreateMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  dateOfBirth: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE"]),
  civilStatus: z.enum(["SINGLE", "MARRIED", "WIDOWED", "SEPARATED"]),
  barangay: z.string().min(1),
  city: z.string().default("Cagayan de Oro"),
  province: z.string().default("Misamis Oriental"),
  contactNumber: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  employmentType: z.enum(["EMPLOYED", "SELF_EMPLOYED", "BUSINESS_OWNER", "FARMER", "UNEMPLOYED"]),
  employerOrBusiness: z.string().optional(),
  monthlyIncome: z.number().min(0),
  membershipDate: z.string().optional(),
});

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = CreateMemberSchema.parse(body);

    // Check for duplicate: same first name + last name + date of birth
    const existing = await prisma.member.findFirst({
      where: {
        firstName: { equals: data.firstName, mode: "insensitive" },
        lastName: { equals: data.lastName, mode: "insensitive" },
        dateOfBirth: new Date(data.dateOfBirth),
      },
      select: { id: true, membershipNumber: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `A member with the same name and date of birth already exists (${existing.membershipNumber}).`,
        },
        { status: 409 }
      );
    }

    // Generate membership number: OIC-YYXXXX
    const year = new Date().getFullYear().toString().slice(2);
    let membershipNumber: string;
    let attempts = 0;
    do {
      const rand = Math.floor(Math.random() * 9999) + 1;
      membershipNumber = `OIC-${year}${String(rand).padStart(4, "0")}`;
      const existing = await prisma.member.findUnique({
        where: { membershipNumber },
        select: { id: true },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 20);

    const member = await prisma.member.create({
      data: {
        membershipNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        civilStatus: data.civilStatus,
        barangay: data.barangay,
        city: data.city,
        province: data.province,
        contactNumber: data.contactNumber,
        email: data.email || null,
        employmentType: data.employmentType,
        employerOrBusiness: data.employerOrBusiness || null,
        monthlyIncome: data.monthlyIncome,
        membershipDate: data.membershipDate
          ? new Date(data.membershipDate)
          : new Date(),
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Member create error:", error);
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    );
  }
}

// GET /api/members - List all members with optional search/filter
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || searchParams.get("q");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const members = await prisma.member.findMany({
      where: {
        ...(status && { membershipStatus: status as "ACTIVE" | "INACTIVE" | "TERMINATED" }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { membershipNumber: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        creditScores: {
          orderBy: { scoreDate: "desc" },
          take: 1,
        },
      },
      orderBy: { lastName: "asc" },
      take: limit,
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Members fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
