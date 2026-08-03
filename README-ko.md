[English](README.md) | 한국어

# Casualties: Unknown Skin Editor

**[Casualties: Unknown](https://store.steampowered.com/app/4576490/)** 경량 웹 기반 스킨 에디터 및 뷰어.

## 주요 기능
- **픽셀 에디터**: 펜, 지우개, 채우기, 영역 선택 등의 내장 도구를 이용한 스프라이트 편집 기능.
- **스킨 미리보기**: 대기(Idle) 및 걷기(Walk) 애니메이션을 통해 편집 중인 스킨의 상태 실시간 확인.
- **로컬 폴더 연동**: 기기에 저장된 스킨 폴더를 업로드 없이 웹 에디터에서 편집.
- **내보내기**: 스킨을 ZIP 파일로 추출하거나 로컬 폴더에 덮어쓰기.
- **스마트 팔레트**: 스프라이트에서 주요 색상 자동 추출.

## 기술 스택
- **Core**: React 19 + TypeScript + Vite
- **Graphics**: HTML5 `<canvas>` API
- **Performance**: 최소한의 외부 라이브러리만을 사용하여 빠른 속도와 경량화된 실행 환경 구현.

## 개발 환경

프로젝트에 대한 기여 및 수정 제안은 언제나 환영합니다!

1. **저장소 클론:**
   ```bash
   git clone https://github.com/ControlCaret/CU-Skin-Editor.git
   cd CU-Skin-Editor
   ```

2. **의존성 설치 및 실행:**
   ```bash
   npm install
   npm run dev
   ```
   이후 브라우저에서 `http://localhost:5173` 접속.

## 면책 조항 (Disclaimer)

본 프로젝트는 비공식 팬 프로젝트입니다. "Casualties: Unknown"의 명칭, 캐릭터 스프라이트, 애니메이션 및 관련 에셋에 대한 모든 소유권은 **[Orsoniks](https://orsonik.itch.io/)** 및/또는 배급사 **[Oro Interactive](https://www.orointeractive.com/)**에게 있습니다. 원작 게임과 관련 에셋에 대한 모든 권리는 해당 권리자에게 독점적으로 귀속됩니다.
