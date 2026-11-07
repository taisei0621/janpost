# 雀ポスト（JanPost）開発規範・ハーネス定義

本ドキュメントは、ソフトウェア開発演習における品質規律およびAIエージェントの行動境界を定義する規範ファイルです。

## 1. アーキテクチャ原則
- **フレームワーク**: Next.js (App Router), TypeScript (Strict Mode), Tailwind CSS
- **状態管理**: クライアント側のインタラクション（牌選択、投票状態）と永続化（localStorage / Supabase）の責務を明確に分離すること。
- **無償枠・安全性の徹底**:
  - クレジットカード登録不要な無償枠で運用すること。
  - APIキーや秘密情報はコードベースに直書きせず、環境変数（`.env.local`）で管理すること。

## 2. 麻雀ドメインの型安全規則
- 手牌は必ず14枚（ツモ牌1枚含む）を標準状態とすること。
- 牌の表記法は `1m-9m` (萬子), `1p-9p` (筒子), `1s-9s` (索子), `1z-7z` (字牌: 東南西北白發中) で統一すること。
- 牌姿のバリデーション（同一牌の枚数が4枚を超えないこと）を保証すること。

## 3. UI/UXの規範
- 麻雀牌はスマートフォンから1タップで選択できる直感的なサイズ・アニメーションを維持すること。
- 回答後は即座に「正誤判定」「戦術解説」「全員の回答分布（打牌統計グラフ）」を提示すること。
- 難易度（初級・中級・上級）の体系的なステップアップ学習体験を損なわないこと。

## 4. 自動検証と変更手順
- 新機能の追加時は、型検査（`tsc --noEmit`）およびビルド検証（`npm run build`）を必ず通過させること。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
