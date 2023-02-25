import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {CreateUserDto} from '@app/user/dto/createUser.dto';
import {UserEntity} from '@app/user/user.entity';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {JWT_SECRET} from '@app/config/config';
import {UserResponseInterface} from '@app/user/types/userResponse.interface';
import {LoginUserDto} from '@app/user/dto/loginUser.dto';
import {compare} from 'bcrypt';
import {UpdateUserDto} from '@app/user/dto/updateUser.dto';

@Injectable()
export class UserService {
  jwt = require('jsonwebtoken');

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
    const errorsResponse = {
      errors: {},
    };
    const userByEmail = await this.checkUserByEmail(createUserDto);
    const userByUsername = await this.checkUserByName(createUserDto);

    if (userByEmail) {
      errorsResponse.errors['email'] = ['has already been taken'];
    }

    if (userByUsername) {
      errorsResponse.errors['username'] = ['has already been taken'];
    }

    if (userByEmail || userByUsername) {
      throw new HttpException(errorsResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const newUser = new UserEntity();
    Object.assign(newUser, createUserDto);
    return await this.userRepository.save(newUser);
  }

  async loginUser(loginUserDto: LoginUserDto): Promise<UserEntity> {
    const errorsResponse = {
      errors: {},
    };

    const user = await this.userRepository.findOne({
      select: ['id', 'username', 'email', 'bio', 'image', 'password'],
      where: {
        email: loginUserDto.email,
      },
    });

    if (!user) {
      errorsResponse.errors['username'] = ['is not valid'];
      throw new HttpException(errorsResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const isPasswordCorrect = await compare(loginUserDto.password, user.password);

    if (!isPasswordCorrect) {
      errorsResponse.errors['password'] = ['is not valid'];
      throw new HttpException(errorsResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    delete user.password;
    return user;
  }

  async updateUser(updateUserDto: UpdateUserDto, userId: number): Promise<UserEntity> {
    let userByEmail = null;
    let userByUsername = null;

    if (updateUserDto.email) {
      userByEmail = await this.checkUserByEmail(updateUserDto);
    }

    if (updateUserDto.username) {
      userByUsername = await this.checkUserByName(updateUserDto);
    }

    if (userByEmail || userByUsername) {
      throw new HttpException('Email or username are taken', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const user = await this.findById(userId);
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async checkUserByEmail(userDto: CreateUserDto | UpdateUserDto): Promise<UserEntity> {
    return await this.userRepository.findOne({
      select: {
        email: true,
      },
      where: {
        email: userDto.email,
      },
    });
  }

  async checkUserByName(userDto: CreateUserDto | UpdateUserDto): Promise<UserEntity> {
    return await this.userRepository.findOne({
      select: {
        username: true,
      },
      where: {
        username: userDto.username,
      },
    });
  }

  async buildUserResponse(user: UserEntity): Promise<UserResponseInterface> {
    return {
      user: {
        ...user,
        token: this.generateJwt(user),
      },
    };
  }

  async findById(id: number): Promise<UserEntity> {
    return this.userRepository.findOne({
      where: {id},
    });
  }

  generateJwt(user: UserEntity): string {
    return this.jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      JWT_SECRET
    );
  }
}
