# Vercel + Supabase 배포

이 문서가 이전 README의 Node 서버 실행 안내를 대체합니다. Vercel은 정적 화면을 제공하고 Supabase Broadcast로 게임을 동기화합니다. 방장 브라우저가 전투를 계산합니다.

1. Supabase 프로젝트를 만들고 Project URL과 Publishable key를 확인합니다. Realtime의 public 채널을 허용합니다. SQL과 테이블 생성은 필요 없습니다.
2. Vercel에서 저장소를 Import하고 Framework를 Other로 선택합니다. vercel.json이 `npm run build`와 출력 폴더 `dist`를 지정합니다.
3. 환경 변수 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`를 추가합니다. legacy anon key는 `SUPABASE_ANON_KEY`로도 지원합니다. 공개 키만 사용하세요. service_role / secret 키는 사용하지 않습니다.
4. Deploy 후 두 컴퓨터에서 같은 URL로 접속합니다. 방 만들기 → 6자리 코드 공유 → 친구 참가 → 방장이 시작합니다. 환경 변수 변경 후 Redeploy가 필요합니다.

각자 WASD 또는 방향키 이동, 자동 공격, 숫자 1~3으로 팀 강화 선택, P로 공동 일시정지. 쓰러진 친구 곁에서 3초 기다리면 구조합니다. 10분 생존 또는 보스 처치로 승리합니다.

방장이 탭을 열어두어야 합니다. 방장 탭이 숨겨지면 일시정지합니다. 잠깐의 연결 단절은 재연결 후 수동 재개합니다. 새로고침·탭 종료 후 진행 복구 및 방장 이전은 지원하지 않습니다. 새 방을 생성하세요. 공용 Broadcast 채널을 사용하는 친구용 프로토타입으로 인증·비공개 채널·치트 방지는 포함되지 않습니다.

로컬: Node.js 20 이상에서 환경 변수를 지정하고 `npm run build`, `npm start` 후 http://localhost:3000 접속. 환경 변수가 없어도 화면 빌드는 되며 방 생성 시 설정 안내를 표시합니다. `npm test`로 핵심 게임 규칙을 검증합니다. 실제 두 컴퓨터 연결은 Supabase 설정 후 별도 확인해야 합니다.

공식 참고: https://supabase.com/docs/guides/realtime/broadcast
