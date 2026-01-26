"use client";

import { useEffect } from "react";

export default function KakaoAuthPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      console.error("❌ 카카오 인가 코드 없음");
      return;
    }

    // 🔥 서버 API로 code 전달
    fetch("/api/auth/kakao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = await res.json();
        console.log("✅ 카카오 로그인 성공", data);
        // TODO: 여기서 Firebase customToken 로그인
      })
      .catch((err) => {
        console.error("🔥 카카오 로그인 실패", err);
      });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>카카오 로그인 처리 중입니다…</h2>
    </div>
  );
}
