import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import fs from 'fs';

// Đường dẫn tuyệt đối tới file data.json lưu trữ dữ liệu
const DATA_FILE = path.resolve(__dirname, 'src/data.json');

// Plugin tùy biến tạo API /api/data để đọc/ghi data.json
function localDataApiPlugin() {
  return {
    name: 'local-data-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url !== '/api/data') {
          return next();
        }

        // Cho phép trình duyệt truy cập từ các máy khác trong mạng nội bộ
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        // Preflight request
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        // GET: Trả về toàn bộ dữ liệu từ data.json
        if (req.method === 'GET') {
          try {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            res.statusCode = 200;
            res.end(data);
          } catch (e) {
            res.statusCode = 200;
            res.end('[]');
          }
          return;
        }

        // POST: Ghi dữ liệu mới vào data.json
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              // Kiểm tra JSON hợp lệ trước khi ghi
              JSON.parse(body);
              fs.writeFileSync(DATA_FILE, body, 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localDataApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
