import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import * as httpProxy from 'http-proxy';

@Controller('monitoring')
export class MonitoringController {
  private proxy = httpProxy.createProxyServer();

  @All('*')
  async proxyToGrafana(@Req() req: Request, @Res() res: Response) {
    // Proxy all requests under /monitoring to Grafana
    this.proxy.web(req, res, {
      target: 'http://localhost:3003', // Grafana on localhost
      changeOrigin: true,
      ws: true, // For WebSocket support if needed
    });
  }
}
