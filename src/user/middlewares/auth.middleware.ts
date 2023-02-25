import {Injectable, NestMiddleware} from '@nestjs/common';
import {Response, NextFunction} from 'express';
import {ExpressRequestInterface} from '@app/types/expressRequest.interface';
import {JWT_SECRET} from '@app/config/config';
import {UserService} from '@app/user/user.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  jwt = require('jsonwebtoken');

  constructor(private readonly userService: UserService) {}

  async use(req: ExpressRequestInterface, res: Response, next: NextFunction) {
    if (!req.headers.authorization) {
      req.user = null;
      next();
      return;
    }

    const token = req.headers.authorization.split(' ')[1];

    try {
      const decode = await this.jwt.verify(token, JWT_SECRET);
      const user = await this.userService.findById(decode.id);
      req.user = user;
      next();
    } catch (error) {
      req.user = null;
      next();
    }
  }
}
