# Vercel + Supabase 배포

기존 온라인 협동 버전을 2인 PvP 배틀로얄로 교체했다. 같은 Supabase 프로젝트와 환경 변수를 사용한다.

1. Supabase 프로젝트의 Project URL과 Publishable key를 준비한다. legacy anon key도 지원한다. Realtime public 채널을 허용한다. SQL이나 테이블 생성은 필요 없다.
2. Vercel에 저장소를 연결하고 배포 대상 브랜치를 fe-design으로 지정한다. Framework는 Other. vercel.json에 빌드 명령 npm run build, 출력 폴더 dist가 지정되어 있다.
3. 환경 변수 SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY를 추가한다. legacy 키는 SUPABASE_ANON_KEY 이름도 가능하다. 공개 키만 사용한다. secret / service_role 키는 사용하지 않는다.
4. 배포 후 두 컴퓨터에서 같은 URL을 열고 방 코드로 참가한다. 환경 변수 변경 후 재배포해야 한다.

새 버전은 after-hours-br 채널을 사용하므로 구버전 생존 게임과 매치가 섞이지 않는다. 업데이트 후 두 사람 모두 페이지를 새로고침하고 새 방을 생성한다.

방장 브라우저가 계산하고 Supabase가 상태와 입력을 중계한다. 방장 탭이 숨겨지면 매치가 멈춘다. 잠깐의 연결 단절은 재연결 후 재개할 수 있지만, 새로고침·종료 후 진행 복구는 지원하지 않는다. 비공개 인증 채널 및 방장 치트 방지는 포함하지 않는다.

로컬 실행: 환경 변수를 설정하고 npm run build, npm start 후 http://localhost:3000 접속. 설정이 없어도 UI 빌드는 가능하지만 온라인 방 생성은 불가능하다.

규칙 테스트: npm test. 브라우저 통합 테스트: node browser-test.cjs (Playwright 필요, 로컬 중계). 실제 Supabase 연결과 배포 성공은 별도로 확인한다.

참고: https://supabase.com/docs/guides/realtime/broadcast
