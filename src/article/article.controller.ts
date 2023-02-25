import {Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UsePipes} from '@nestjs/common';
import {AuthGuard} from '@app/user/guards/auth.guard';
import {ArticleService} from '@app/article/article.service';
import {User} from '@app/user/decorators/user.decorator';
import {UserEntity} from '@app/user/user.entity';
import {PersistArticleDto} from '@app/article/dto/persistArticle.dto';
import {ArticleResponseInterface} from '@app/article/types/articleResponse.interface';
import {ArticlesResponseInterface} from '@app/article/types/articlesResponse.interface';
import {BackendValidationPipe} from '@app/shared/pipes/backendValidation.pipe';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  async findAll(@User('id') currentUserId: number, @Query() query: any): Promise<ArticlesResponseInterface> {
    return await this.articleService.findAll(currentUserId, query);
  }

  @Get('feed')
  @UseGuards(AuthGuard)
  async getFeed(@User('id') currentUserId: number, @Query() query: any): Promise<ArticlesResponseInterface> {
    return await this.articleService.getFeed(currentUserId, query);
  }

  @Post()
  @UseGuards(AuthGuard)
  @UsePipes(new BackendValidationPipe())
  async create(
    @User() currentUser: UserEntity,
    @Body('article') createArticleDto: PersistArticleDto
  ): Promise<ArticleResponseInterface> {
    const article = await this.articleService.createArticle(currentUser, createArticleDto);
    return this.articleService.buildArticleResponse(article);
  }

  @Get(':slug')
  async getSingleArticle(@Param('slug') slug: string): Promise<ArticleResponseInterface> {
    const article = await this.articleService.findBySlug(slug);
    return this.articleService.buildArticleResponse(article);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard)
  async deleteSingleArticle(@User('id') currentUserId: number, @Param('slug') slug: string) {
    return await this.articleService.deleteSingleArticle(slug, currentUserId);
  }

  @Put(':slug')
  @UseGuards(AuthGuard)
  @UsePipes(new BackendValidationPipe())
  async updateArticle(
    @User('id') currentUserId: number,
    @Param('slug') slug: string,
    @Body('article') updateArticleDto: PersistArticleDto
  ): Promise<ArticleResponseInterface> {
    const article = await this.articleService.updateSingleArticle(slug, currentUserId, updateArticleDto);
    return this.articleService.buildArticleResponse(article);
  }

  @Post(':slug/favorite')
  @UseGuards(AuthGuard)
  async addArticleToFavorites(
    @User('id') currentUserId: number,
    @Param('slug') slug: string
  ): Promise<ArticleResponseInterface> {
    const article = await this.articleService.addArticleToFavorites(currentUserId, slug);
    return this.articleService.buildArticleResponse(article);
  }

  @Delete(':slug/favorite')
  @UseGuards(AuthGuard)
  async deleteArticleFromFavorites(
    @User('id') currentUserId: number,
    @Param('slug') slug: string
  ): Promise<ArticleResponseInterface> {
    const article = await this.articleService.deleteArticleFromFavorites(currentUserId, slug);
    return this.articleService.buildArticleResponse(article);
  }
}
