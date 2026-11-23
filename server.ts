import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'minbar-server',
    timestamp: new Date().toISOString(),
  });
});

// Academic Citation Generator (APA 7, MLA 9, Chicago) for Research & Study Posts
app.post('/api/format-citation', (req: Request, res: Response) => {
  const body = req.body as {
    author?: string;
    title?: string;
    year?: string;
    publisher?: string;
    url?: string;
    style?: 'APA' | 'MLA' | 'Chicago';
  };

  const author = String(body?.author || '').trim().slice(0, 120);
  const title = String(body?.title || '').trim().slice(0, 200);
  const year = String(body?.year || new Date().getFullYear()).trim().slice(0, 10);
  const publisher = String(body?.publisher || '').trim().slice(0, 120);
  const url = String(body?.url || '').trim().slice(0, 300);
  const style = body?.style || 'APA';

  if (!author || !title) {
    res.status(400).json({ error: 'يرجى إدخال اسم المؤلف وعنوان المرجع.' });
    return;
  }

  let formatted = '';
  if (style === 'APA') {
    formatted = `${author} (${year}). ${title}.${publisher ? ` ${publisher}.` : ''}${url ? ` ${url}` : ''}`;
  } else if (style === 'MLA') {
    formatted = `${author}. "${title}."${publisher ? ` ${publisher},` : ''} ${year}.${url ? ` ${url}.` : ''}`;
  } else {
    formatted = `${author}. ${title}.${publisher ? ` ${publisher},` : ''} ${year}.${url ? ` ${url}.` : ''}`;
  }

  res.json({ style, formatted });
});

// Offline Study Sheet Export (Markdown / Text)
app.post('/api/export-notes', (req: Request, res: Response) => {
  const body = req.body as {
    title?: string;
    subject?: string;
    authorName?: string;
    authorRole?: string;
    content?: string;
    replies?: Array<{ authorName: string; authorRole: string; body: string; isVerifiedAnswer: boolean }>;
  };

  if (!body?.title || !body?.content) {
    res.status(400).json({ error: 'بيانات الملخص غير مكتملة.' });
    return;
  }

  const lines: string[] = [
    `# ${String(body.title).slice(0, 160)}`,
    '',
    `- **المادة:** ${String(body.subject || '')}`,
    `- **الكاتب:** ${String(body.authorName || '')} (${body.authorRole === 'teacher' ? 'معلم' : 'طالب'})`,
    `- **تاريخ التصدير:** ${new Date().toISOString().slice(0, 10)}`,
    '',
    '---',
    '',
    String(body.content).slice(0, 4000),
    '',
  ];

  if (Array.isArray(body.replies) && body.replies.length > 0) {
    lines.push('---', '', '## الإجابات والنقاشات', '');
    body.replies.slice(0, 50).forEach((r, idx) => {
      const badge = r.isVerifiedAnswer ? ' [إجابة علمية موثّقة]' : '';
      const role = r.authorRole === 'teacher' ? 'معلم' : 'طالب';
      lines.push(`### ${idx + 1}. ${r.authorName} (${role})${badge}`, '', r.body, '');
    });
  }

  const docText = '\uFEFF' + lines.join('\n');
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="minbar-study-notes.md"');
  res.send(docText);
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      plugins: disableHmr
        ? [
            {
              name: 'disable-vite-client-ws-when-hmr-off',
              enforce: 'post',
              transform(code, id) {
                if (id.includes('vite/dist/client/client.mjs')) {
                  return code.replace(
                    'transport.connect(createHMRHandler(handleMessage));',
                    '/* HMR disabled: WebSocket connection skipped */'
                  );
                }
                return null;
              },
            },
          ]
        : [],
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: disableHmr ? false : true,
        ws: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Minbar server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
