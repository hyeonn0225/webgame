# PC방 생존자 — 온라인 2인 협동

Vercel 정적 호스팅과 Supabase Realtime을 사용하는 무한 맵 생존 게임입니다. 방장이 방을 만들고 친구가 다른 컴퓨터에서 코드로 참가합니다.

- WASD / 방향키 이동, 자동 공격
- 팀 경험치·강화, 동료 구조, 10분 생존과 보스전
- 방장 브라우저가 전투 계산, Realtime으로 입력·상태 공유

[배포 및 실행 안내](DEPLOY.md)를 따라 Vercel에 SUPABASE_URL과 SUPABASE_PUBLISHABLE_KEY를 설정하세요.

로컬 실행: `npm run build` 후 `npm start`. 테스트: `npm test`. Windows PowerShell에서 실행 정책 오류가 있으면 `npm.cmd`를 사용하세요.

방장 탭 종료 또는 새로고침 시 새 방이 필요합니다. 실제 Supabase 연결과 공개 배포는 프로젝트 설정 후 확인해야 합니다.
