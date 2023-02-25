import {MiddlewareConsumer, Module, RequestMethod} from '@nestjs/common';
import {AppController} from '@app/app.controller';
import {AppService} from '@app/app.service';
import {TagModule} from '@app/tag/tag.module';
import {TypeOrmModule} from '@nestjs/typeorm';
import ormconfig from '@app/ormconfig';
import {UserModule} from '@app/user/user.module';
import {AuthMiddleware} from '@app/user/middlewares/auth.middleware';
import {ArticleModule} from '@app/article/article.module';
import {DataSource} from 'typeorm';
import {ProfileModule} from '@app/profile/profile.module';

@Module({
  imports: [TypeOrmModule.forRoot(ormconfig), TagModule, UserModule, ArticleModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}

  getDataSource() {
    return this.dataSource;
  }
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
