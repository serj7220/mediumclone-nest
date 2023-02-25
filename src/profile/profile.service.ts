import {Repository} from 'typeorm';
import {InjectRepository} from '@nestjs/typeorm';
import {UserEntity} from '@app/user/user.entity';
import {ProfileType} from '@app/profile/types/profile.type';
import {HttpException, HttpStatus, Injectable} from '@nestjs/common';
import {ProfileResponseInterface} from '@app/profile/types/profileResponse.interface';
import {FollowEntity} from '@app/profile/follow.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FollowEntity) private readonly followRepository: Repository<FollowEntity>
  ) {}

  async getProfile(currentUserId: number, profileUsername: string): Promise<ProfileType> {
    const user = await this.userRepository.findOne({where: {username: profileUsername}});

    if (!user) {
      throw new HttpException('Profile does not exist', HttpStatus.NOT_FOUND);
    }

    const follow = await this.followRepository.findOne({
      where: {
        followerId: Number(currentUserId),
        followingId: user.id,
      },
    });

    return {...user, following: Boolean(follow)};
  }

  async followProfile(currentUserId: number, profileUsername: string): Promise<ProfileType> {
    const profileUser = await this.getUserProfile(profileUsername);
    const follow: FollowEntity = await this.getFollowProfile(currentUserId, profileUser);

    if (!follow) {
      const followToCreate = new FollowEntity();
      followToCreate.followerId = currentUserId;
      followToCreate.followingId = profileUser.id;
      await this.followRepository.save(followToCreate);
    }

    return {...profileUser, following: true};
  }

  async unfollowProfile(currentUserId: number, profileUsername: string): Promise<ProfileType> {
    const profileUser = await this.getUserProfile(profileUsername);

    await this.followRepository.delete({
      followerId: currentUserId,
      followingId: profileUser.id,
    });

    return {...profileUser, following: false};
  }

  private async getFollowProfile(currentUserId: number, profileUser: UserEntity): Promise<FollowEntity> {
    if (!profileUser) {
      throw new HttpException('Profile does not exist', HttpStatus.NOT_FOUND);
    }

    if (currentUserId === profileUser.id) {
      throw new HttpException(`Follower and following can't be equal`, HttpStatus.BAD_REQUEST);
    }

    return await this.followRepository.findOne({
      where: {
        followerId: currentUserId,
        followingId: profileUser.id,
      },
    });
  }

  private async getUserProfile(profileUsername: string): Promise<UserEntity> {
    return await this.userRepository.findOne({where: {username: profileUsername}});
  }

  buildProfileResponse(profile: ProfileType): ProfileResponseInterface {
    delete profile.email;
    delete profile.id;
    return {profile};
  }
}
