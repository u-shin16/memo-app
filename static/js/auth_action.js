(function initAuthActionPage() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  const els = {
    title: document.getElementById("actionTitle"),
    pending: document.getElementById("actionPending"),
    success: document.getElementById("actionSuccess"),
    error: document.getElementById("actionError"),
    errorMessage: document.getElementById("actionErrorMessage"),
    completeBtn: document.getElementById("completeVerificationBtn"),
  };

  const ERROR_MESSAGES = {
    "auth/expired-action-code": "リンクの有効期限が切れています。MusubiMemoに戻って確認メールを再送してください。",
    "auth/invalid-action-code": "リンクが無効、またはすでに使用済みです。MusubiMemoに戻って認証状況を更新してください。",
    "auth/user-disabled": "このアカウントは無効化されています。",
  };

  function showState(state, message = "") {
    els.pending.hidden = state !== "pending";
    els.success.hidden = state !== "success";
    els.error.hidden = state !== "error";
    if (state === "success") els.title.textContent = "認証完了";
    if (state === "error") {
      els.title.textContent = "認証エラー";
      if (message) els.errorMessage.textContent = message;
    }
  }

  function translateError(error) {
    return ERROR_MESSAGES[error?.code] || "認証処理に失敗しました。MusubiMemoに戻って確認メールを再送してください。";
  }

  async function completeVerification() {
    if (!window.FIREBASE_READY || typeof firebase === "undefined") {
      showState("error", "Firebaseが設定されていないため、認証を完了できません。");
      return;
    }
    if (mode !== "verifyEmail" || !oobCode) {
      showState("error", "メール認証リンクが正しくありません。");
      return;
    }

    els.completeBtn.disabled = true;
    els.completeBtn.textContent = "認証しています...";
    try {
      firebase.auth().languageCode = "ja";
      await firebase.auth().applyActionCode(oobCode);
      showState("success");
    } catch (error) {
      showState("error", translateError(error));
    } finally {
      els.completeBtn.disabled = false;
      els.completeBtn.textContent = "認証を完了する";
    }
  }

  if (mode !== "verifyEmail" || !oobCode) {
    showState("error", "メール認証リンクが正しくありません。");
    return;
  }

  els.completeBtn.addEventListener("click", completeVerification);
})();
