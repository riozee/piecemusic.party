/**
 * Client-side user-facing messages for the download portal.
 *
 * Centralised here so that copy is easy to review, update, and
 * eventually internationalise — mirroring the server-side `_errors.ts`
 * pattern used in `functions/api/`.
 */

export const CLIENT_MSG = {
  // ---- PasscodeGate -------------------------------------------------------
  PASSCODE_EMPTY: 'パスコードを入力してください。',
  TURNSTILE_TIMEOUT:
    'セキュリティ確認がタイムアウトしました。広告ブロッカーを無効にするか、ページを再読み込みしてお試しください。',
  TURNSTILE_LOAD_FAIL:
    'セキュリティ確認の読み込みに失敗しました。広告ブロッカーを無効にするか、ページを再読み込みしてください。',
  NETWORK_ERROR:
    'サーバーとの通信が切断されました。通信環境をご確認の上、数分後にもう一度お試しください。',
  SERVER_ERROR:
    'サーバーとの通信中にエラーが発生しました。しばらく経ってからもう一度お試しください。',

  // ---- Download -----------------------------------------------------------
  OFFLINE:
    'インターネットに接続されていません。接続を確認してから再度お試しください。',
  SESSION_EXPIRED:
    'セッションの有効期限が切れました。ページを再読み込みして再度パスコードを入力してください。',
  DOWNLOAD_FAIL:
    'ダウンロードを開始できませんでした。しばらく経ってからもう一度お試しください。',
  DOWNLOAD_OOM:
    'ファイルの準備中にメモリ不足が発生しました。ほかのタブを閉じてから再度お試しください。',
  DOWNLOAD_NETWORK:
    'ダウンロード中に通信が切断されました。通信環境をご確認の上、もう一度お試しください。',

  // ---- Audio playback -----------------------------------------------------
  AUDIO_SESSION_EXPIRED:
    'セッションの有効期限が切れました。ページを再読み込みして再度パスコードを入力してください。',
  AUDIO_NOT_FOUND:
    '音声ファイルが見つかりません。ページを再読み込みしてお試しください。問題が続く場合はお問い合わせください。',
  AUDIO_UNSUPPORTED:
    'このブラウザではこの音声形式を再生できません。別のブラウザ（Chrome / Safari）をお試しください。',
  AUDIO_GIVE_UP:
    '再生を続行できませんでした。通信環境をご確認の上、ページを再読み込みしてお試しください。',
  AUDIO_RECONNECTING: '再生が中断されました。再接続しています…',
  AUDIO_STALL: '読み込みに時間がかかっています。通信環境をご確認ください。',
  AUDIO_AUTOPLAY_BLOCKED:
    '自動再生がブロックされました。再生ボタンをタップしてください。',
} as const
