import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // 로그 확인용
  console.log("KAKAO CODE:", code);

  // 👉 여기서 바로 서버 API로 code 전달하거나
  // 👉 임시로 OK 응답만 해도 됨
  return NextResponse.json({
    ok: true,
    code,
  });
}
