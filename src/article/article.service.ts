import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {UserEntity} from '@app/user/user.entity';
import {PersistArticleDto} from '@app/article/dto/persistArticle.dto';
import {ArticleEntity} from '@app/article/article.entity';
import {InjectRepository} from '@nestjs/typeorm';
import {DeleteResult, Repository} from 'typeorm';
import {ArticleResponseInterface} from '@app/article/types/articleResponse.interface';
import slugify from 'slugify';
import {ArticlesResponseInterface} from '@app/article/types/articlesResponse.interface';
import {FollowEntity} from '@app/profile/follow.entity';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FollowEntity)
    private readonly followRepository: Repository<FollowEntity>
  ) {}

  async findAll(currentUserId: number, query: any): Promise<ArticlesResponseInterface> {
    const queryBuilder = this.articleRepository
      .createQueryBuilder('articles')
      .leftJoinAndSelect('articles.author', 'author');

    queryBuilder.orderBy('articles.createdAt', 'DESC');
    const articlesCount = await queryBuilder.getCount();

    if (query.tag) {
      queryBuilder.andWhere('articles.tagList LIKE :tag', {
        tag: `%${query.tag}%`,
      });
    }

    if (query.author) {
      const author = await this.userRepository.findOne({
        where: {username: query.author},
      });
      queryBuilder.andWhere('articles.authorId = :id', {
        id: author.id,
      });
    }

    if (query.favorited) {
      const author = await this.userRepository.findOne({
        where: {username: query.favorited},
        relations: ['favorites'],
      });
      const ids = author.favorites.map((el: ArticleEntity) => {
        return el.id;
      });

      if (ids.length > 0) {
        queryBuilder.andWhere('articles.id IN (:...ids)', {ids});
      } else {
        queryBuilder.andWhere('1=0');
      }
    }

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    let favoriteIds: number[] = [];
    if (currentUserId) {
      const currentUser = await this.userRepository.findOne({
        where: {id: currentUserId},
        relations: ['favorites'],
      });
      favoriteIds = currentUser.favorites.map((favorite: ArticleEntity) => favorite.id);
    }

    const articles = await queryBuilder.getMany();
    const articlesWithFavorited = articles.map((article: ArticleEntity) => {
      const favorited = favoriteIds.includes(article.id);
      return {...article, favorited};
    });

    return {articles: articlesWithFavorited, articlesCount};
  }

  async getFeed(currentUserId: number, query: any): Promise<ArticlesResponseInterface> {
    const follows = await this.followRepository.find({
      where: {
        followerId: currentUserId,
      },
    });

    if (follows.length === 0) {
      return {articles: [], articlesCount: 0};
    }

    const followingUserIds = follows.map((follow: FollowEntity) => follow.followingId);

    const queryBuilder = this.articleRepository
      .createQueryBuilder('articles')
      .leftJoinAndSelect('articles.author', 'author')
      .where('articles.authorId IN (:...ids)', {ids: followingUserIds});

    queryBuilder.orderBy('articles.createdAt', 'DESC');

    const articlesCount = await queryBuilder.getCount();

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    const articles = await queryBuilder.getMany();

    return {articles, articlesCount};
  }

  async createArticle(currentUser: UserEntity, createArticleDto: PersistArticleDto): Promise<ArticleEntity> {
    const article = new ArticleEntity();
    Object.assign(article, createArticleDto);

    article.tagList = article.tagList ? article.tagList : [];
    article.author = currentUser;
    article.slug = this.getSlug(article.title);

    return this.articleRepository.save(article);
  }

  async findBySlug(slug: string): Promise<ArticleEntity> {
    const article = await this.articleRepository.findOne({where: {slug}});

    if (!article) {
      throw new HttpException('Article does not exist', HttpStatus.NOT_FOUND);
    }

    return article;
  }

  async deleteSingleArticle(slug: string, currentUserId: number): Promise<DeleteResult> {
    const article = await this.findBySlug(slug);

    if (!article) {
      throw new HttpException('Article does not exist', HttpStatus.NOT_FOUND);
    }

    if (article.author.id !== currentUserId) {
      throw new HttpException('You are not an author', HttpStatus.FORBIDDEN);
    }

    return await this.articleRepository.delete({slug});
  }

  async updateSingleArticle(
    slug: string,
    currentUserId: number,
    updateArticleDto: PersistArticleDto
  ): Promise<ArticleEntity> {
    const article = await this.findBySlug(slug);

    if (!article) {
      throw new HttpException('Article does not exist', HttpStatus.NOT_FOUND);
    }

    if (article.author.id !== currentUserId) {
      throw new HttpException('You are not an author', HttpStatus.FORBIDDEN);
    }

    if (updateArticleDto.title) {
      article.slug = this.getSlug(updateArticleDto.title);
    }

    Object.assign(article, updateArticleDto);
    return await this.articleRepository.save(article);
  }

  async addArticleToFavorites(currentUserId: number, slug: string): Promise<ArticleEntity> {
    const article = await this.findBySlug(slug);

    const user = await this.userRepository.findOne({
      where: {id: currentUserId},
      relations: ['favorites'],
    });

    const isNotFavorited =
      user.favorites.findIndex((articleInFavorites: ArticleEntity) => articleInFavorites.id === article.id) === -1;

    if (isNotFavorited) {
      user.favorites.push(article);
      article.favoritesCount++;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }

    return article;
  }

  async deleteArticleFromFavorites(currentUserId: number, slug: string): Promise<ArticleEntity> {
    const article = await this.findBySlug(slug);

    const user = await this.userRepository.findOne({
      where: {id: currentUserId},
      relations: ['favorites'],
    });

    const articleIndex = user.favorites.findIndex(
      (articleInFavorites: ArticleEntity) => articleInFavorites.id === article.id
    );

    if (articleIndex >= 0) {
      user.favorites.splice(articleIndex, 1);
      article.favoritesCount--;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }

    return article;
  }

  buildArticleResponse(article: ArticleEntity): ArticleResponseInterface {
    return {article};
  }

  private getSlug(title: string): string {
    return slugify(title, {lower: true}) + '-' + ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
  }
}
