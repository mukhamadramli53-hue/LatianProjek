<?php
/**
 * Sistem Pelayanan Desa - Laragon Diagnostic & Management Portal
 * 
 * Halaman ini digunakan khusus untuk diagnosa, pemantauan server,
 * dan administrasi lingkungan Laragon.
 * 
 * Akses:
 * - http://LatihanProjek.test/launcher.php
 * - http://localhost/LatihanProjek/launcher.php
 * - http://localhost/LatihanProjek/?launcher=1
 */

$nodeHost = '127.0.0.1';
$nodePort = 3000;
$appUrl = 'http://localhost:3000';
$vhostUrl = 'http://LatihanProjek.test';

// Periksa apakah server Next.js aktif di port 3000
$isNodeRunning = false;
$socket = @fsockopen($nodeHost, $nodePort, $errno, $errstr, 0.4);
if (is_resource($socket)) {
    $isNodeRunning = true;
    fclose($socket);
}

// Periksa koneksi MySQL (database pelayanan_desa_dev)
$mysqlStatus = false;
$mysqlMsg = '';
$userStats = [];
$totalApps = 0;
try {
    $mysqli = @new mysqli('127.0.0.1', 'root', '', 'pelayanan_desa_dev', 3306);
    if (!$mysqli->connect_error) {
        $mysqlStatus = true;
        $mysqlMsg = 'Terhubung ke database pelayanan_desa_dev (MySQL 8.4)';
        
        // Ambil ringkasan user
        $uRes = $mysqli->query("SELECT role, COUNT(*) as cnt FROM users GROUP BY role");
        if ($uRes) {
            while ($row = $uRes->fetch_assoc()) {
                $userStats[$row['role']] = (int)$row['cnt'];
            }
            $uRes->free();
        }
        
        // Ambil ringkasan pengajuan
        $aRes = $mysqli->query("SELECT COUNT(*) as cnt FROM applications");
        if ($aRes) {
            $row = $aRes->fetch_assoc();
            $totalApps = (int)$row['cnt'];
            $aRes->free();
        }
        $mysqli->close();
    } else {
        $mysqlMsg = $mysqli->connect_error;
    }
} catch (Throwable $t) {
    $mysqlMsg = $t->getMessage();
}

// Aksi AJAX / API: Trigger start Next.js jika diminta
if (isset($_GET['action']) && $_GET['action'] === 'start_server') {
    header('Content-Type: application/json');
    if ($isNodeRunning) {
        echo json_encode(['status' => 'already_running', 'message' => 'Server Next.js sudah aktif']);
        exit;
    }
    
    // Jalankan start-app.bat di background secara asynchronous tanpa memblokir PHP
    $batPath = realpath(__DIR__ . '/start-app.bat');
    if ($batPath && file_exists($batPath)) {
        pclose(popen("start /B cmd /c \"" . $batPath . "\" > nul 2>&1", "r"));
        echo json_encode(['status' => 'starting', 'message' => 'Proses startup server Next.js telah dipicu']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'File start-app.bat tidak ditemukan']);
    }
    exit;
}

// Aksi AJAX: Check health ping
if (isset($_GET['ping'])) {
    header('Content-Type: application/json');
    echo json_encode([
        'node' => $isNodeRunning,
        'mysql' => $mysqlStatus,
        'vhostUrl' => $vhostUrl,
        'appUrl' => $appUrl
    ]);
    exit;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal Diagnostik — Sistem Pelayanan Desa</title>
    <style>
        :root {
            --primary: #10b981;
            --primary-dark: #059669;
            --bg: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.88);
            --border: rgba(148, 163, 184, 0.18);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 20px;
        }
        .container {
            width: 100%;
            max-width: 760px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 36px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.55), 0 0 40px rgba(16, 185, 129, 0.1);
            backdrop-filter: blur(16px);
        }
        .header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
        }
        .icon {
            width: 54px;
            height: 54px;
            background: linear-gradient(135deg, #10b981, #06b6d4);
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            box-shadow: 0 8px 18px rgba(16, 185, 129, 0.35);
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 4px;
        }
        p.subtitle {
            font-size: 13px;
            color: var(--text-muted);
        }
        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-success {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .badge-warning {
            background: rgba(245, 158, 11, 0.2);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .status-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 22px;
        }
        .status-card {
            background: rgba(15, 23, 42, 0.65);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
        }
        .status-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 8px;
        }
        .status-val {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        .indicator-on {
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
        }
        .indicator-off {
            background: #f59e0b;
            box-shadow: 0 0 10px #f59e0b;
        }
        .db-stats {
            margin-top: 8px;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
        }
        .btn-group {
            display: flex;
            gap: 12px;
            margin-bottom: 22px;
            flex-wrap: wrap;
        }
        .btn {
            flex: 1;
            min-width: 190px;
            text-align: center;
            padding: 13px 20px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            border: none;
        }
        .btn-primary {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: white;
            border: 1px solid var(--border);
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.14);
        }
        .btn-action {
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: white;
        }
        .btn-action:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        }
        .info-box {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 18px;
            font-size: 13px;
            line-height: 1.6;
            margin-bottom: 18px;
        }
        .info-box h3 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        code {
            background: rgba(0, 0, 0, 0.4);
            padding: 3px 6px;
            border-radius: 6px;
            color: #a7f3d0;
            font-family: Consolas, monospace;
        }
        .footer {
            margin-top: 18px;
            text-align: center;
            font-size: 12px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🏛️</div>
            <div style="flex: 1;">
                <h1>Diagnostik Sistem Pelayanan Desa</h1>
                <p class="subtitle">Next.js 16 • React 19 • Auth.js • Prisma ORM • MySQL Laragon • Apache Proxy</p>
            </div>
            <div>
                <?php if ($isNodeRunning): ?>
                    <span class="badge badge-success">✓ Server Aktif</span>
                <?php else: ?>
                    <span class="badge badge-warning">⚡ Menunggu Server</span>
                <?php endif; ?>
            </div>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <div class="status-title">Server Next.js (Node.js)</div>
                <div class="status-val">
                    <span class="indicator <?php echo $isNodeRunning ? 'indicator-on' : 'indicator-off'; ?>" id="node-ind"></span>
                    <span id="node-text"><?php echo $isNodeRunning ? 'Aktif di Port 3000' : 'Belum Berjalan'; ?></span>
                </div>
                <div class="db-stats">
                    URL Langsung: <a href="http://localhost:3000" target="_blank" style="color: #38bdf8;">http://localhost:3000</a>
                </div>
            </div>
            <div class="status-card">
                <div class="status-title">Virtual Host Laragon (Reverse Proxy)</div>
                <div class="status-val">
                    <span class="indicator <?php echo $isNodeRunning ? 'indicator-on' : 'indicator-off'; ?>"></span>
                    <span>Port 80 (Apache Proxy)</span>
                </div>
                <div class="db-stats">
                    Domain vHost: <a href="<?php echo htmlspecialchars($vhostUrl); ?>" target="_blank" style="color: #34d399; font-weight: 600;"><?php echo htmlspecialchars($vhostUrl); ?></a>
                </div>
            </div>
            <div class="status-card">
                <div class="status-title">Database MySQL Laragon</div>
                <div class="status-val">
                    <span class="indicator <?php echo $mysqlStatus ? 'indicator-on' : 'indicator-off'; ?>"></span>
                    <span><?php echo $mysqlStatus ? 'Terkoneksi (Port 3306)' : 'Gagal Konek'; ?></span>
                </div>
                <div class="db-stats">
                    <?php echo htmlspecialchars($mysqlMsg); ?>
                </div>
            </div>
            <div class="status-card">
                <div class="status-title">Ringkasan Data Produksi</div>
                <div class="status-val">
                    <span>📋 <?php echo $totalApps; ?> Berkas Pengajuan</span>
                </div>
                <div class="db-stats">
                    <?php
                    if (!empty($userStats)) {
                        $parts = [];
                        foreach ($userStats as $r => $c) {
                            $parts[] = "$r: $c";
                        }
                        echo "Pengguna: " . implode(" • ", $parts);
                    } else {
                        echo "Status pengguna: belum ada data";
                    }
                    ?>
                </div>
            </div>
        </div>

        <div class="btn-group">
            <a href="<?php echo htmlspecialchars($vhostUrl); ?>" class="btn btn-primary">
                🚀 Buka Aplikasi vHost (<?php echo htmlspecialchars($vhostUrl); ?>)
            </a>
            <a href="http://localhost:3000" class="btn btn-secondary">
                🌐 Buka Langsung Port 3000
            </a>
            <?php if (!$isNodeRunning): ?>
            <button type="button" class="btn btn-action" id="btn-start" onclick="triggerStartServer()">
                ▶ Jalankan Server Next.js
            </button>
            <?php endif; ?>
        </div>

        <div class="info-box">
            <h3>📌 Panduan Lingkungan & Arsitektur</h3>
            <ul style="margin-left: 20px;">
                <li style="margin-bottom: 6px;">
                    <strong>Alamat Utama:</strong> Gunakan <code>http://LatihanProjek.test</code> untuk mengakses aplikasi dengan port standar 80 melalui Apache Reverse Proxy Laragon.
                </li>
                <li style="margin-bottom: 6px;">
                    <strong>Akses Localhost:</strong> Membuka <code>http://localhost/LatihanProjek/</code> kini langsung mengalihkan Anda ke antarmuka resmi Sistem Pelayanan Desa.
                </li>
                <li style="margin-bottom: 6px;">
                    <strong>Skrip Startup Mandiri:</strong> Jalankan <code>start-app.bat</code> jika ingin menjalankan server secara mandiri di command prompt terpisah.
                </li>
            </ul>
        </div>

        <div class="footer">
            Sistem Informasi Pelayanan Desa Digital &copy; 2026 • Portal Diagnostik & Manajemen Server
        </div>
    </div>

    <script>
    function triggerStartServer() {
        const btn = document.getElementById('btn-start');
        if (btn) {
            btn.disabled = true;
            btn.innerText = '⏳ Memulai Server...';
        }
        fetch('launcher.php?action=start_server')
            .then(res => res.json())
            .then(data => {
                pollServer();
            })
            .catch(err => {
                alert('Gagal memicu startup: ' + err);
                if (btn) btn.disabled = false;
            });
    }

    function pollServer() {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            fetch('launcher.php?ping=1')
                .then(r => r.json())
                .then(d => {
                    if (d.node) {
                        clearInterval(interval);
                        window.location.href = d.vhostUrl;
                    }
                })
                .catch(() => {});
            if (attempts > 30) {
                clearInterval(interval);
                alert('Server memerlukan waktu lebih lama. Silakan periksa jendela start-app.bat.');
            }
        }, 1000);
    }
    </script>
</body>
</html>
