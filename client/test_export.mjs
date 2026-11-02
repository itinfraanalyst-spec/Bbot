import { chromium } from '@playwright/test';

async function testExport() {
  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const context = await browser.newContext();
  
  // Set auth cookie
  await context.addCookies([
    {
      name: 'access_token',
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiaGF2eWExMkBtYWlsLmNvbSIsInRva2VuX3ZlcnNpb24iOjAsImV4cCI6MTc5MjgzODI3NX0.FfpANiefFb1a-0nc3rG2OAKAjl2d1q_p9tQ8v0ZJmis',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', (err) => {
    console.error('[BROWSER ERROR]:', err);
  });

  // Navigate to studio and seed localStorage
  await page.goto('http://localhost:5173/studio');
  await page.evaluate(() => {
    const sampleDiagram = {
      diagramType: 'process_flow',
      title: 'HR Lifecycle & Ops Architecture',
      summary: 'End-to-end HR operating principles and stage pipeline',
      viewMode: 'canvas',
      theme: 'cyberpunk',
      nodes: [
        {
          id: 'n1',
          label: 'HR Operating Principles',
          sublabel: 'Core operational governance',
          type: 'start',
          order: 1,
          badge: '01',
          x: 100,
          y: 150,
          width: 240,
          height: 110,
          customStyle: { shape: 'card', borderColor: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', textColor: '#22d3ee' }
        },
        {
          id: 'n2',
          label: 'Recruitment & Selection',
          sublabel: 'Candidate sourcing & screening',
          type: 'process',
          order: 2,
          badge: '02',
          x: 420,
          y: 150,
          width: 240,
          height: 110,
          customStyle: { shape: 'diamond', borderColor: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.12)', textColor: '#fbbf24' }
        },
        {
          id: 'n3',
          label: 'Employee Onboarding',
          sublabel: 'Zero-trust provisioning & training',
          type: 'process',
          order: 3,
          badge: '03',
          x: 740,
          y: 150,
          width: 240,
          height: 110,
          customStyle: { shape: 'card', borderColor: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.12)', textColor: '#c084fc' }
        }
      ],
      edges: [
        { id: 'e1_2', source: 'n1', target: 'n2', label: 'Candidate Qualified', style: 'solid', customStyle: { color: '#06b6d4', routing: 'curved' } },
        { id: 'e2_3', source: 'n2', target: 'n3', label: 'Offer Accepted', style: 'solid', customStyle: { color: '#f59e0b', routing: 'curved' } }
      ]
    };
    localStorage.setItem('bbot_visual_studio_state', JSON.stringify({
      prompt: 'HR Process Architecture',
      selectedType: 'process_flow',
      diagram: sampleDiagram
    }));
  });

  console.log('Reloading with seeded state...');
  await page.reload({ waitUntil: 'networkidle' });

  // Check if bbot-studio-canvas-content exists
  const canvasEl = await page.$('#bbot-studio-canvas-content');
  console.log('bbot-studio-canvas-content found:', !!canvasEl);

  // 1. TOP NAVBAR "Export PNG"
  console.log('Testing Export PNG...');
  const pngBtn = page.locator('button:has-text("Export PNG")');
  await pngBtn.waitFor({ state: 'visible' });
  const [downloadPng] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    pngBtn.click(),
  ]);
  if (downloadPng) {
    console.log('TOP NAVBAR PNG SUCCEEDED! Filename:', downloadPng.suggestedFilename());
    await downloadPng.saveAs('top_nav_test_out.png');
    console.log('Saved top_nav_test_out.png');
  }

  // Wait for export idle
  await page.waitForTimeout(1000);

  // 2. TOP NAVBAR "Export SVG"
  console.log('Testing Export SVG...');
  const svgBtn = page.locator('button:has-text("Export SVG")');
  await svgBtn.waitFor({ state: 'visible' });
  const [downloadSvg] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    svgBtn.click(),
  ]);
  if (downloadSvg) {
    console.log('TOP NAVBAR SVG SUCCEEDED! Filename:', downloadSvg.suggestedFilename());
    await downloadSvg.saveAs('top_nav_test_out.svg');
    console.log('Saved top_nav_test_out.svg');
  }

  // Wait for export idle
  await page.waitForTimeout(1000);

  // 3. TOP NAVBAR "Export PDF"
  console.log('Testing Export PDF...');
  const pdfBtn = page.locator('button:has-text("Export PDF")');
  await pdfBtn.waitFor({ state: 'visible' });
  const [downloadPdf] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    pdfBtn.click(),
  ]);
  if (downloadPdf) {
    console.log('TOP NAVBAR PDF SUCCEEDED! Filename:', downloadPdf.suggestedFilename());
    await downloadPdf.saveAs('top_nav_test_out.pdf');
    console.log('Saved top_nav_test_out.pdf');
  }

  // 4. Test Template Mode Export
  console.log('Switching to template mode...');
  await page.evaluate(() => {
    const raw = localStorage.getItem('bbot_visual_studio_state');
    if (raw) {
      const data = JSON.parse(raw);
      data.diagram.viewMode = 'template';
      localStorage.setItem('bbot_visual_studio_state', JSON.stringify(data));
    }
  });
  await page.reload({ waitUntil: 'networkidle' });

  const templateExportBtn = await page.$('button:has-text("Export PNG")');
  if (templateExportBtn) {
    console.log('Clicking Export PNG in template mode...');
    const [downloadTemplate] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }).catch((e) => {
        console.log('Download Template error:', e.message);
        return [null];
      }),
      templateExportBtn.click(),
    ]);

    if (downloadTemplate) {
      console.log('TEMPLATE MODE PNG SUCCEEDED! Filename:', downloadTemplate.suggestedFilename());
      await downloadTemplate.saveAs('template_test_out.png');
      console.log('Saved template_test_out.png');
    }
  }

  await page.waitForTimeout(2000);
  await browser.close();
  console.log('Done test.');
}

testExport().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
