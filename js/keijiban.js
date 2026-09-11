// Firebase SDK v10 (Modular) インポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Firebase 設定情報
const firebaseConfig = {
    projectId: "saitama-navi-2026",
    storageBucket: "saitama-navi-2026.appspot.com"
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM要素
const mainPostForm = document.getElementById("main-post-form");
const postImageInput = document.getElementById("post-image");
const imagePreviewContainer = document.getElementById("image-preview-container");
const postsList = document.getElementById("posts-list");

// 画像プレビュー制御
postImageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    imagePreviewContainer.innerHTML = "";
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement("img");
            img.src = event.target.result;
            imagePreviewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
    }
});

// 親投稿処理
mainPostForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("submit-btn");
    const authorName = document.getElementById("author-name").value.trim();
    const postContent = document.getElementById("post-content").value.trim();
    const imageFile = postImageInput.files[0];

    if (!authorName || !postContent) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "送信中...";

    try {
        let imageUrl = "";

        // 画像選択時は Storage に保存
        if (imageFile) {
            const fileRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
            await uploadBytes(fileRef, imageFile);
            imageUrl = await getDownloadURL(fileRef);
        }

        // Firestore に親投稿（parentId: null）を追加
        await addDoc(collection(db, "posts"), {
            author: authorName,
            content: postContent,
            imageUrl: imageUrl,
            parentId: null,
            createdAt: serverTimestamp()
        });

        mainPostForm.reset();
        imagePreviewContainer.innerHTML = "";
    } catch (error) {
        alert("投稿の送信に失敗しました: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "投稿する";
    }
});

// リアルタイム取得・画面描画
const q = query(collection(db, "posts"), orderBy("createdAt", "asc"));

onSnapshot(q, (snapshot) => {
    const allPosts = [];
    snapshot.forEach((doc) => {
        allPosts.push({ id: doc.id, ...doc.data() });
    });

    // 親投稿とリプライに振り分け
    const parentPosts = allPosts.filter(p => !p.parentId).reverse(); // 親は新しい順
    const replies = allPosts.filter(p => p.parentId);

    renderPosts(parentPosts, replies);
});

// HTML描画関数
function renderPosts(parentPosts, replies) {
    if (parentPosts.length === 0) {
        postsList.innerHTML = '<p class="no-posts">まだ投稿がありません。最初の投稿をしてみましょう！</p>';
        return;
    }

    postsList.innerHTML = "";

    parentPosts.forEach((post) => {
        const postCard = document.createElement("article");
        postCard.className = "post-card";

        const formattedDate = formatDate(post.createdAt);
        const postReplies = replies.filter(r => r.parentId === post.id);

        postCard.innerHTML = `
            <div class="post-header">
                <span class="post-author">${escapeHTML(post.author)}</span>
                <span class="post-date">${formattedDate}</span>
            </div>
            <div class="post-body">${escapeHTML(post.content)}</div>
            ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-attached-image" alt="添付画像">` : ""}
            
            <div class="post-footer">
                <button type="button" class="btn-reply-toggle" data-id="${post.id}">💬 返信する (${postReplies.length})</button>
            </div>

            <!-- リプライ入力フォーム -->
            <div class="reply-form-wrapper" id="reply-form-${post.id}">
                <form class="reply-form" data-parent-id="${post.id}">
                    <div class="form-group">
                        <input type="text" class="reply-author-input" placeholder="お名前" required>
                    </div>
                    <div class="form-group">
                        <textarea class="reply-content-input" rows="2" placeholder="返信を入力..." required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" data-id="${post.id}">キャンセル</button>
                        <button type="submit" class="btn-reply-send">返信する</button>
                    </div>
                </form>
            </div>

            <!-- リプライ一覧表示領域 -->
            <div class="replies-container">
                ${postReplies.map(reply => `
                    <div class="reply-card">
                        <div class="reply-header">
                            <span class="reply-author">${escapeHTML(reply.author)}</span>
                            <span class="reply-date">${formatDate(reply.createdAt)}</span>
                        </div>
                        <div class="reply-body">${escapeHTML(reply.content)}</div>
                    </div>
                `).join("")}
            </div>
        `;

        postsList.appendChild(postCard);
    });

    attachEventHandlers();
}

// イベントハンドラーのアタッチ
function attachEventHandlers() {
    // 返信フォームのトグル表示
    document.querySelectorAll(".btn-reply-toggle").forEach(btn => {
        btn.onclick = () => {
            const parentId = btn.getAttribute("data-id");
            const formWrapper = document.getElementById(`reply-form-${parentId}`);
            formWrapper.classList.toggle("active");
        };
    });

    // キャンセルボタン
    document.querySelectorAll(".btn-cancel").forEach(btn => {
        btn.onclick = () => {
            const parentId = btn.getAttribute("data-id");
            const formWrapper = document.getElementById(`reply-form-${parentId}`);
            formWrapper.classList.remove("active");
        };
    });

    // リプライ送信処理
    document.querySelectorAll(".reply-form").forEach(form => {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const parentId = form.getAttribute("data-parent-id");
            const author = form.querySelector(".reply-author-input").value.trim();
            const content = form.querySelector(".reply-content-input").value.trim();
            const submitBtn = form.querySelector(".btn-reply-send");

            if (!author || !content) return;

            submitBtn.disabled = true;
            submitBtn.textContent = "送信中...";

            try {
                await addDoc(collection(db, "posts"), {
                    author: author,
                    content: content,
                    imageUrl: "",
                    parentId: parentId,
                    createdAt: serverTimestamp()
                });

                form.reset();
                document.getElementById(`reply-form-${parentId}`).classList.remove("active");
            } catch (error) {
                alert("返信の送信に失敗しました: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "返信する";
            }
        };
    });
}

// 日時フォーマット関数
function formatDate(timestamp) {
    if (!timestamp) return "投稿中...";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${d} ${hh}:${mm}`;
}

// HTMLエスケープ処理（XSS対策）
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}