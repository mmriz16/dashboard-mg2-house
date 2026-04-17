import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SSH_HOST = process.env.ORACLE_SSH_HOST || "168.110.192.119";
const SSH_USER = process.env.ORACLE_SSH_USER || "ubuntu";
const SSH_PORT = process.env.ORACLE_SSH_PORT || "22";
const SSH_KEY_CANDIDATES = [
  process.env.ORACLE_SSH_KEY_PATH,
  "C:\\Users\\miftakhul.rizky\\Downloads\\Code_and_Dev\\ssh.key",
  "C:\\Users\\miftakhul.rizky\\Downloads\\ssh.key",
].filter((value): value is string => Boolean(value));

export type ServerOverview = {
  hostname: string;
  uptimeSeconds: number;
  uptimeHuman: string;
  loadAverage: string[];
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    availableMb: number;
    swapTotalMb: number;
    swapUsedMb: number;
  };
  disks: Array<{
    mount: string;
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usedPercent: number;
  }>;
  docker: {
    total: number;
    healthy: number;
    unhealthy: number;
    containers: Array<{
      name: string;
      status: string;
      ports: string;
    }>;
  };
  nginxSiteCount: number;
  failedUnits: string[];
};

export type WebsiteRecord = {
  id: string;
  file: string;
  domains: string[];
  primaryDomain: string;
  type: "proxy" | "static" | "unknown";
  target: string;
  httpsEnabled: boolean;
  certificatePath: string;
  certificateExpiry: string | null;
};

export type ServerLogs = {
  nginxErrors: string[];
  failedUnits: string[];
  unhealthyContainers: Array<{
    name: string;
    status: string;
    ports: string;
  }>;
};

export type EnvironmentSnapshot = {
  local: Array<{
    file: string;
    keys: string[];
  }>;
  docker: Array<{
    name: string;
    keys: string[];
  }>;
};

function resolveSshKeyPath() {
  const match = SSH_KEY_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error("No SSH key found for server monitoring.");
  }
  return match;
}

export async function sshRun(command: string, timeoutMs = 20000) {
  const keyPath = resolveSshKeyPath();
  const { stdout } = await execFileAsync(
    "ssh",
    [
      "-i",
      keyPath,
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=accept-new",
      "-o",
      "ConnectTimeout=10",
      "-p",
      SSH_PORT,
      `${SSH_USER}@${SSH_HOST}`,
      command,
    ],
    {
      encoding: "utf8",
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
    },
  );

  return stdout || "";
}

export async function sshRunJson<T>(script: string, timeoutMs = 25000) {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  const command = `python3 -c "import base64; exec(base64.b64decode('${encoded}').decode())"`;
  const stdout = await sshRun(command, timeoutMs);
  return JSON.parse(stdout) as T;
}

export async function getServerOverview() {
  return sshRunJson<ServerOverview>(`
import json, os, socket, shutil, subprocess
def uptime_human(seconds):
    seconds = int(seconds)
    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    minutes = (seconds % 3600) // 60
    parts = []
    if days: parts.append(f"{days}d")
    if hours or days: parts.append(f"{hours}h")
    parts.append(f"{minutes}m")
    return " ".join(parts)
meminfo = {}
with open("/proc/meminfo", "r", encoding="utf-8") as fh:
    for line in fh:
        key, value = line.split(":", 1)
        meminfo[key] = int(value.strip().split()[0])
with open("/proc/uptime", "r", encoding="utf-8") as fh:
    uptime_seconds = float(fh.read().split()[0])
disks = []
for mount in ["/", "/var", "/home"]:
    usage = shutil.disk_usage(mount)
    used = usage.total - usage.free
    disks.append({"mount": mount, "totalGb": round(usage.total / (1024 ** 3), 1), "usedGb": round(used / (1024 ** 3), 1), "freeGb": round(usage.free / (1024 ** 3), 1), "usedPercent": round((used / usage.total) * 100, 1) if usage.total else 0})
docker_lines = subprocess.run(["docker", "ps", "--format", "{{.Names}}|{{.Status}}|{{.Ports}}"], capture_output=True, text=True).stdout.splitlines()
containers, healthy, unhealthy = [], 0, 0
for line in docker_lines:
    parts = line.split("|")
    if len(parts) < 3: continue
    status = parts[1].strip()
    containers.append({"name": parts[0].strip(), "status": status, "ports": parts[2].strip()})
    if "(healthy)" in status: healthy += 1
    if "unhealthy" in status.lower() or "exited" in status.lower(): unhealthy += 1
failed_units = [line.strip() for line in subprocess.run(["systemctl", "--failed", "--no-legend", "--plain"], capture_output=True, text=True).stdout.splitlines() if line.strip()]
site_count = len([name for name in os.listdir("/etc/nginx/sites-enabled") if not name.endswith(".bak")]) if os.path.isdir("/etc/nginx/sites-enabled") else 0
print(json.dumps({"hostname": socket.gethostname(), "uptimeSeconds": int(uptime_seconds), "uptimeHuman": uptime_human(uptime_seconds), "loadAverage": [f"{value:.2f}" for value in os.getloadavg()], "memory": {"totalMb": round(meminfo.get("MemTotal", 0) / 1024), "usedMb": round((meminfo.get("MemTotal", 0) - meminfo.get("MemAvailable", 0)) / 1024), "freeMb": round(meminfo.get("MemFree", 0) / 1024), "availableMb": round(meminfo.get("MemAvailable", 0) / 1024), "swapTotalMb": round(meminfo.get("SwapTotal", 0) / 1024), "swapUsedMb": round((meminfo.get("SwapTotal", 0) - meminfo.get("SwapFree", 0)) / 1024)}, "disks": disks, "docker": {"total": len(containers), "healthy": healthy, "unhealthy": unhealthy, "containers": containers}, "nginxSiteCount": site_count, "failedUnits": failed_units}))
`);
}

export async function getWebsites() {
  return sshRunJson<WebsiteRecord[]>(`
import json, os, subprocess
from pathlib import Path
records = []
base = Path("/etc/nginx/sites-enabled")
if base.exists():
    for entry in sorted(base.iterdir()):
        if entry.name.endswith(".bak"): continue
        text = entry.read_text(encoding="utf-8", errors="ignore")
        domains, target, root, cert = [], "", "", ""
        https_enabled = False
        current_location = ""
        default_proxy = ""
        fallback_proxy = ""
        for raw_line in text.splitlines():
            line = raw_line.split("#", 1)[0].strip().rstrip(";")
            if not line or line.startswith("#"): continue
            if line.startswith("server_name "):
                domains.extend([part for part in line.split()[1:] if part])
            elif line.startswith("location "):
                current_location = line.split("{", 1)[0].replace("location", "", 1).strip()
            elif line.startswith("proxy_pass ") and not target:
                proxy_value = line.split(" ", 1)[1].strip()
                if current_location == "/":
                    default_proxy = proxy_value
                elif not fallback_proxy:
                    fallback_proxy = proxy_value
            elif line.startswith("root ") and not root:
                root = line.split(" ", 1)[1].strip()
            elif line.startswith("ssl_certificate ") and not cert:
                cert = line.split(" ", 1)[1].strip()
            elif "listen 443" in line:
                https_enabled = True
            elif line == "}":
                current_location = ""
        unique_domains = []
        for domain in domains:
            if domain not in unique_domains:
                unique_domains.append(domain)
        primary = next((value for value in unique_domains if value not in ["_", "168.110.192.119"]), unique_domains[0] if unique_domains else entry.name)
        website_type = "proxy" if target else ("static" if root else "unknown")
        target_value = default_proxy or fallback_proxy or root or "-"
        website_type = "proxy" if (default_proxy or fallback_proxy) else ("static" if root else "unknown")
        expiry = None
        if cert and os.path.exists(cert):
            result = subprocess.run(["openssl", "x509", "-enddate", "-noout", "-in", cert], capture_output=True, text=True)
            if result.returncode == 0:
                expiry = result.stdout.strip().replace("notAfter=", "")
        records.append({"id": entry.name, "file": str(entry), "domains": unique_domains, "primaryDomain": primary, "type": website_type, "target": target_value, "httpsEnabled": https_enabled, "certificatePath": cert, "certificateExpiry": expiry})
print(json.dumps(records))
`);
}

export async function getServerLogs() {
  return sshRunJson<ServerLogs>(`
import json, subprocess
def command_lines(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    return [line.rstrip() for line in result.stdout.splitlines() if line.strip()]
nginx_errors = command_lines(["sudo", "tail", "-n", "40", "/var/log/nginx/error.log"])
failed_units = command_lines(["systemctl", "--failed", "--no-legend", "--plain"])
docker_lines = command_lines(["docker", "ps", "--format", "{{.Names}}|{{.Status}}|{{.Ports}}"])
unhealthy = []
for line in docker_lines:
    name, status, ports = (line.split("|") + ["", ""])[:3]
    lowered = status.lower()
    if "unhealthy" in lowered or "exited" in lowered:
        unhealthy.append({"name": name, "status": status, "ports": ports})
print(json.dumps({"nginxErrors": nginx_errors, "failedUnits": failed_units, "unhealthyContainers": unhealthy}))
`);
}

export async function getEnvironmentSnapshot() {
  return sshRunJson<EnvironmentSnapshot["docker"]>(`
import json, subprocess
container_names = subprocess.run(["docker", "ps", "--format", "{{.Names}}"], capture_output=True, text=True).stdout.splitlines()
records = []
for name in container_names:
    if not name.strip():
        continue
    result = subprocess.run(["docker", "inspect", name, "--format", "{{range .Config.Env}}{{println .}}{{end}}"], capture_output=True, text=True)
    keys = []
    if result.returncode == 0:
        for line in result.stdout.splitlines():
            if "=" in line:
                key = line.split("=", 1)[0].strip()
                if key and key not in keys:
                    keys.append(key)
    records.append({"name": name.strip(), "keys": sorted(keys)})
print(json.dumps(records))
`);
}
