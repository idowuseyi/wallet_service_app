import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  key: string; // Hashed value

  @Column({ length: 15 })
  prefix: string; // First 7-15 chars for identification (e.g., 'sk_live_abc')

  @Column()
  name: string;

  @Column({ type: 'simple-array' })
  permissions: string[]; // ['read', 'deposit', 'transfer']

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @ManyToOne(() => User, (user) => user.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
