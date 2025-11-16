// LocalStorageAdapter.ts - ローカルストレージ実装
// ブラウザのlocalStorageを使った実装例

import type { GenogramData } from '../core/types';
import type { StorageAdapter, GenogramMetadata } from './StorageAdapter';
import { StorageError } from './StorageAdapter';

/**
 * 保存データの形式
 */
interface StoredGenogram {
    data: GenogramData;
    metadata: GenogramMetadata;
}

/**
 * ローカルストレージを使ったストレージアダプター
 * 開発・テスト用途や、シンプルなアプリケーションに適している
 * 
 * 注意:
 * - データはブラウザに保存されるため、他のデバイスと同期されない
 * - ブラウザのストレージをクリアするとデータが失われる
 * - 容量制限あり（通常5-10MB程度）
 */
export class LocalStorageAdapter implements StorageAdapter {
    private readonly prefix: string;

    /**
     * @param prefix ストレージキーのプレフィックス（デフォルト: 'genogram'）
     */
    constructor(prefix: string = 'genogram') {
        this.prefix = prefix;
    }

    /**
     * ストレージキーを生成
     */
    private getKey(userId: string, genogramId: string): string {
        return `${this.prefix}:${userId}:${genogramId}`;
    }

    /**
     * ユーザーのインデックスキーを生成
     */
    private getIndexKey(userId: string): string {
        return `${this.prefix}:index:${userId}`;
    }

    /**
     * ジェノグラムデータを保存
     */
    async save(
        userId: string,
        genogramId: string,
        data: GenogramData,
        metadata?: Partial<GenogramMetadata>
    ): Promise<void> {
        try {
            const key = this.getKey(userId, genogramId);
            const now = new Date();

            // 既存のメタデータを取得
            const existing = await this.load(userId, genogramId);
            const existingMeta = existing ? this.getStoredMetadata(userId, genogramId) : null;

            // メタデータを作成
            const fullMetadata: GenogramMetadata = {
                id: genogramId,
                name: metadata?.name || existingMeta?.name || `ジェノグラム ${genogramId}`,
                createdAt: existingMeta?.createdAt || now,
                updatedAt: now
            };

            const storedData: StoredGenogram = {
                data,
                metadata: fullMetadata
            };

            // データを保存
            localStorage.setItem(key, JSON.stringify(storedData));

            // インデックスを更新
            await this.updateIndex(userId, genogramId, fullMetadata);
        } catch (error) {
            throw new StorageError(
                'Failed to save genogram',
                'UNKNOWN',
                error
            );
        }
    }

    /**
     * ジェノグラムデータを読み込み
     */
    async load(userId: string, genogramId: string): Promise<GenogramData | null> {
        try {
            const key = this.getKey(userId, genogramId);
            const stored = localStorage.getItem(key);

            if (!stored) {
                return null;
            }

            const parsed: StoredGenogram = JSON.parse(stored);
            return parsed.data;
        } catch (error) {
            throw new StorageError(
                'Failed to load genogram',
                'UNKNOWN',
                error
            );
        }
    }

    /**
     * ユーザーのジェノグラム一覧を取得
     */
    async list(userId: string): Promise<GenogramMetadata[]> {
        try {
            const indexKey = this.getIndexKey(userId);
            const stored = localStorage.getItem(indexKey);

            if (!stored) {
                return [];
            }

            const index: GenogramMetadata[] = JSON.parse(stored);

            // Date型に変換
            return index.map(item => ({
                ...item,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt)
            }));
        } catch (error) {
            throw new StorageError(
                'Failed to list genograms',
                'UNKNOWN',
                error
            );
        }
    }

    /**
     * ジェノグラムを削除
     */
    async delete(userId: string, genogramId: string): Promise<void> {
        try {
            const key = this.getKey(userId, genogramId);
            localStorage.removeItem(key);

            // インデックスから削除
            const indexKey = this.getIndexKey(userId);
            const stored = localStorage.getItem(indexKey);

            if (stored) {
                const index: GenogramMetadata[] = JSON.parse(stored);
                const filtered = index.filter(item => item.id !== genogramId);
                localStorage.setItem(indexKey, JSON.stringify(filtered));
            }
        } catch (error) {
            throw new StorageError(
                'Failed to delete genogram',
                'UNKNOWN',
                error
            );
        }
    }

    /**
     * メタデータのみ更新
     */
    async updateMetadata(
        userId: string,
        genogramId: string,
        metadata: Partial<GenogramMetadata>
    ): Promise<void> {
        try {
            const key = this.getKey(userId, genogramId);
            const stored = localStorage.getItem(key);

            if (!stored) {
                throw new StorageError(
                    'Genogram not found',
                    'NOT_FOUND'
                );
            }

            const parsed: StoredGenogram = JSON.parse(stored);
            parsed.metadata = {
                ...parsed.metadata,
                ...metadata,
                updatedAt: new Date()
            };

            localStorage.setItem(key, JSON.stringify(parsed));

            // インデックスも更新
            await this.updateIndex(userId, genogramId, parsed.metadata);
        } catch (error) {
            if (error instanceof StorageError) throw error;

            throw new StorageError(
                'Failed to update metadata',
                'UNKNOWN',
                error
            );
        }
    }

    /**
     * インデックスを更新（内部メソッド）
     */
    private async updateIndex(
        userId: string,
        genogramId: string,
        metadata: GenogramMetadata
    ): Promise<void> {
        const indexKey = this.getIndexKey(userId);
        const stored = localStorage.getItem(indexKey);

        let index: GenogramMetadata[] = stored ? JSON.parse(stored) : [];

        // 既存のエントリを更新または追加
        const existingIndex = index.findIndex(item => item.id === genogramId);
        if (existingIndex >= 0) {
            index[existingIndex] = metadata;
        } else {
            index.push(metadata);
        }

        // 更新日時で降順ソート
        index.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        localStorage.setItem(indexKey, JSON.stringify(index));
    }

    /**
     * 保存されているメタデータを取得（内部メソッド）
     */
    private getStoredMetadata(userId: string, genogramId: string): GenogramMetadata | null {
        try {
            const key = this.getKey(userId, genogramId);
            const stored = localStorage.getItem(key);

            if (!stored) return null;

            const parsed: StoredGenogram = JSON.parse(stored);
            return {
                ...parsed.metadata,
                createdAt: new Date(parsed.metadata.createdAt),
                updatedAt: new Date(parsed.metadata.updatedAt)
            };
        } catch {
            return null;
        }
    }

    /**
     * すべてのデータをクリア（開発・テスト用）
     */
    async clearAll(userId: string): Promise<void> {
        const list = await this.list(userId);
        for (const item of list) {
            await this.delete(userId, item.id);
        }
    }
}