# GHCR 與 VM 部署

此專案的 production 部署由 GitHub Actions 建置 Docker image、推送至
GitHub Container Registry（GHCR），VM 僅執行 `docker compose pull` 與
`docker compose up`，不在 VM 上建置原始碼。

## 1. VM 前置設定

VM 必須已安裝 Docker Engine、Docker Compose v2 與 Tailscale，且已連上與
GitHub Actions 相同的 tailnet。以部署使用者登入 VM，建立專用 SSH key：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/gh_actions
cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

把私鑰 `~/.ssh/gh_actions` 的完整內容存入 GitHub Secret
`VM_SSH_KEY`。不要把私鑰加入 Git。

從可信任的本機取得 VM host key，確認 fingerprint 後，把輸出整行存入
GitHub Secret `VM_KNOWN_HOSTS`：

```bash
ssh-keyscan -H your-vm.example.com
```

VM 上的部署目錄預設為登入帳號 home 下的
`taipei-accessible-map-deploy`。GitHub Actions 每次會更新該目錄內的
`docker-compose.yml`；VM 必須自行保留 `.env`，至少包含：

```dotenv
TUNNEL_TOKEN=your_cloudflare_tunnel_token
```

## 2. GitHub Environment 與設定值

先建立下列 GitHub Actions Secrets。可直接設為 Repository Secrets；若 GitHub
方案支援 private repository 的 Environment secrets 與 protection rules，則建議
建立名為 `production` 的 Environment，並把部署 Secrets 放在其中：

| Secret | 用途 |
| --- | --- |
| `VM_HOST` | VM IP 或 domain |
| `VM_USER` | SSH 登入帳號 |
| `VM_SSH_KEY` | CI/CD 專用 ed25519 私鑰完整內容 |
| `VM_KNOWN_HOSTS` | 已驗證的 VM SSH host key |
| `GHCR_READ_TOKEN` | 選填；private GHCR package 使用，需 `read:packages` |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth Client ID |
| `TS_OAUTH_SECRET` | Tailscale OAuth Client Secret |

`VM_HOST` 可直接使用 VM 的 Tailscale IP，例如 `100.69.112.120`。在 Tailscale
Admin Console 建立 `tag:ci`，再於 **Trust credentials** 建立 OAuth Client：

1. Scope 選擇 `auth_keys`。
2. Tag 選擇 `tag:ci`。
3. 將產生的 Client ID 與 Client Secret 分別存入上述 GitHub Secrets。

workflow 每次部署會建立帶有 `tag:ci` 的 ephemeral Tailscale 節點，確認能
ping `VM_HOST` 後才執行 SSH，結束時會自動清除。若 tailnet 使用自訂 access
policy，必須允許 `tag:ci` 存取 VM 的 TCP 22 port。

設定下列 GitHub Repository Variables：

| Variable | 用途 | 預設值 |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | Next.js build-time OAuth Client ID | 空值 |
| `NEXT_PUBLIC_END_POINT` | Next.js build-time backend URL | 空值 |
| `VM_DEPLOY_PATH` | VM 部署目錄，不可含空白 | `taipei-accessible-map-deploy` |
| `VM_PORT` | SSH port | `22` |
| `GHCR_USERNAME` | private GHCR 登入帳號 | repository owner |

前端的 `NEXT_PUBLIC_*` 值會編入瀏覽器 bundle，本來就不是機密，因此使用
Variables 而非 Secrets。

如果 GHCR package 設為 public，VM 可匿名 pull，`GHCR_READ_TOKEN` 不必設定。
如果 package 維持 private，建立只含 `read:packages` 權限的 classic PAT，
存入 `GHCR_READ_TOKEN`；不要把 Actions 自動產生的 `GITHUB_TOKEN` 長期保存到
VM。

## 3. 自動部署與回滾

Push 到 `main` 後，workflow 會：

1. 在 GitHub-hosted runner 建置 image。
2. 推送 `${commit SHA}` 與 `latest` 兩個 tags 至
   `ghcr.io/yuzen9622/taipei-accessible-map`。
3. 建立 ephemeral Tailscale 節點並確認 VM 可達。
4. 透過 Tailscale 網路以 SSH 上傳 Compose 定義。
5. VM pull 該次 commit SHA，執行 `up -d --no-build --wait`，並等待 healthcheck。

需要回滾時，在 GitHub Actions 選擇 **Build and deploy** →
**Run workflow**，於 `image_tag` 輸入先前成功部署的完整 commit SHA。
workflow 會跳過 build，直接讓 VM pull 並啟動該版本。

若要在 VM 手動回滾：

```bash
cd ~/taipei-accessible-map-deploy
WEB_IMAGE=ghcr.io/yuzen9622/taipei-accessible-map \
WEB_IMAGE_TAG=previous_commit_sha \
docker compose pull web
WEB_IMAGE=ghcr.io/yuzen9622/taipei-accessible-map \
WEB_IMAGE_TAG=previous_commit_sha \
docker compose up -d --no-build --wait --wait-timeout 120
```
