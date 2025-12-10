import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';

interface GoogleUserDto {
  email: string;
  firstName: string;
  lastName: string;
  googleId: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) { }

  async validateGoogleUser(googleUser: GoogleUserDto): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let user = await queryRunner.manager.findOne(User, {
        where: { email: googleUser.email },
      });

      if (!user) {
        // Create user and wallet in a transaction
        user = queryRunner.manager.create(User, {
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          googleId: googleUser.googleId,
        });
        await queryRunner.manager.save(user);

        // Generate unique 10-digit wallet number
        const walletNumber = this.generateWalletNumber();

        const wallet = queryRunner.manager.create(Wallet, {
          walletNumber,
          balance: 0,
          currency: 'NGN',
          userId: user.id,
        });
        await queryRunner.manager.save(wallet);
      } else if (!user.googleId) {
        // Update existing user with Google ID
        user.googleId = googleUser.googleId;
        await queryRunner.manager.save(user);
      }

      await queryRunner.commitTransaction();
      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private generateWalletNumber(): string {
    // Generate a 10-digit number
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
}
