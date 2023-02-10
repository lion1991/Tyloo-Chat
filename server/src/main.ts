import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { logger } from './common/middleware/logger.middleware'
import { ResponseInterceptor } from './common/interceptor/response.interceptor'
import { join } from 'path'
import { IoAdapter } from '@nestjs/platform-socket.io'
import * as http from 'http'
import * as https from 'https'
import * as fs from 'fs'
import * as express from 'express'

const httpsOptions = {
  ca: fs.readFileSync('/www/server/web_conf/ssl/xxxx.xyz/fullchain.pem'),
  key: fs.readFileSync('/www/server/web_conf/ssl/xxxx.xyz/privkey.pem'),
  cert: fs.readFileSync('/www/server/web_conf/ssl/xxxx.xyz/fullchain.pem'),
}

const fix_socket_io_bug = require('./fix')

async function bootstrap() {
  await fix_socket_io_bug()

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    httpsOptions,
  })
  // https://github.com/vercel/ncc/issues/513
  // fix ncc打包后提示找不到该依赖问题
  app.useWebSocketAdapter(new IoAdapter(app))

  // 全局中间件
  app.use(logger)

  // 全局过滤器
  app.useGlobalFilters(new HttpExceptionFilter())

  // 配置全局拦截器
  app.useGlobalInterceptors(new ResponseInterceptor())

  // 配置静态资源
  app.useStaticAssets(join(__dirname, '../public', '/'), {
    prefix: '/',
    setHeaders: res => {
      res.set('Cache-Control', 'max-age=2592000')
    }
  })

  await app.listen(3000)
}
bootstrap()
