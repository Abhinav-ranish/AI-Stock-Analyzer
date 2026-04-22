import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tickers = await prisma.portfolio.findMany({
      where: { userId: session.user.id },
      orderBy: { ticker: "asc" },
    });

    return NextResponse.json(tickers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ticker, frequency } = await req.json();

    const existing = await prisma.portfolio.findUnique({
      where: { userId_ticker: { userId: session.user.id, ticker } },
    });

    if (existing) return NextResponse.json({ error: "Stock already exists" }, { status: 400 });

    const data = await prisma.portfolio.create({
      data: {
        userId: session.user.id,
        ticker,
        frequency,
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ticker } = await req.json();

    await prisma.portfolio.delete({
      where: { userId_ticker: { userId: session.user.id, ticker } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ticker, frequency } = await req.json();

    await prisma.portfolio.update({
      where: { userId_ticker: { userId: session.user.id, ticker } },
      data: { frequency },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
