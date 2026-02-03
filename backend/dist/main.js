"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const response_interceptor_1 = require("./common/response.interceptor");
const http_exception_filter_1 = require("./common/http-exception.filter");
(0, dotenv_1.config)({ path: (0, path_1.join)(process.cwd(), ".env") });
(0, dotenv_1.config)({ path: (0, path_1.join)(process.cwd(), "prisma", ".env") });
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    });
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    await app.listen(3000);
}
bootstrap();
