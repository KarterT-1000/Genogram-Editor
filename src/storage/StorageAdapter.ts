// StorageAdapter.ts - ストレージインターフェース
// DB連携のための抽象インターフェース

import type { GenogramData } from '../core/types';

/**
 * ジェノグラムのメタデータ
 */
export interface GenogramMetadata {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * ストレージアダプターのインターフェース
 * このインターフェースを実装することで、任意のDBと連携可能
 * 
 * 実装例:
 * - LocalStorageAdapter: ブラウザのローカルストレージ
 * - FirebaseAdapter: Firebase Firestore
 * - SupabaseAdapter: Supabase PostgreSQL
 * - RestApiAdapter: 独自REST API
 */
export interface StorageAdapter {
    /**
     * ジェノグラムデータを保存
     * @param userId ユーザーID
     * @param genogramId ジェノグラムID
     * @param data ジェノグラムデータ
     * @param metadata メタデータ（オプション）
     */
    save(
        userId: string,
        genogramId: string,
        data: GenogramData,
        metadata?: Partial<GenogramMetadata>
    ): Promise<void>;

    /**
     * ジェノグラムデータを読み込み
     * @param userId ユーザーID
     * @param genogramId ジェノグラムID
     * @returns ジェノグラムデータ（存在しない場合はnull）
     */
    load(userId: string, genogramId: string): Promise<GenogramData | null>;

    /**
     * ユーザーのジェノグラム一覧を取得
     * @param userId ユーザーID
     * @returns ジェノグラムメタデータの配列
     */
    list(userId: string): Promise<GenogramMetadata[]>;

    /**
     * ジェノグラムを削除
     * @param userId ユーザーID
     * @param genogramId ジェノグラムID
     */
    delete(userId: string, genogramId: string): Promise<void>;

    /**
     * メタデータのみ更新（名前変更など）
     * @param userId ユーザーID
     * @param genogramId ジェノグラムID
     * @param metadata 更新するメタデータ
     */
    updateMetadata?(
        userId: string,
        genogramId: string,
        metadata: Partial<GenogramMetadata>
    ): Promise<void>;
}

/**
 * ストレージエラー
 */
export class StorageError extends Error {
    public code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN';
    public originalError?: unknown;

    constructor(
        message: string,
        code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'NETWORK_ERROR' | 'UNKNOWN',
        originalError?: unknown
    ) {
        super(message);
        this.name = 'StorageError';
        this.code = code;
        this.originalError = originalError;
    }
}