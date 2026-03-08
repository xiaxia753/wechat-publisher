/**
 * 微信公众号API封装
 */

const https = require('https');
const fs = require('fs');

class WechatAPI {
    constructor(appId, appSecret) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.accessToken = null;
        this.tokenExpireTime = 0;
    }
    
    /**
     * 获取Access Token
     */
    async getAccessToken() {
        // 检查缓存的Token是否有效
        if (this.accessToken && Date.now() < this.tokenExpireTime) {
            return this.accessToken;
        }
        
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
        const result = await this._httpsGet(url);
        
        if (result.access_token) {
            this.accessToken = result.access_token;
            this.tokenExpireTime = Date.now() + (result.expires_in - 300) * 1000; // 提前5分钟过期
            return this.accessToken;
        }
        
        throw new Error('获取Access Token失败: ' + JSON.stringify(result));
    }
    
    /**
     * 上传图片素材
     */
    async uploadImage(imagePath) {
        const token = await this.getAccessToken();
        
        return new Promise((resolve, reject) => {
            const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
            const formData = fs.readFileSync(imagePath);
            
            const postData = Buffer.concat([
                Buffer.from(`--${boundary}\r\n`),
                Buffer.from(`Content-Disposition: form-data; name="media"; filename="cover.jpg"\r\n`),
                Buffer.from(`Content-Type: image/jpeg\r\n\r\n`),
                formData,
                Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);
            
            const options = {
                hostname: 'api.weixin.qq.com',
                path: `/cgi-bin/material/add_material?access_token=${token}&type=image`,
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': postData.length
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve({ raw: data });
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }
    
    /**
     * 创建草稿
     */
    async createDraft(articles) {
        const token = await this.getAccessToken();
        const articleList = Array.isArray(articles) ? articles : [articles];
        const postData = JSON.stringify({ articles: articleList });
        const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;
        return this._httpsPost(url, postData);
    }
    
    /**
     * 发布文章
     */
    async publish(mediaId) {
        const token = await this.getAccessToken();
        const postData = JSON.stringify({ media_id: mediaId });
        const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${token}`;
        return this._httpsPost(url, postData);
    }
    
    /**
     * 获取草稿列表
     */
    async getDraftList(offset = 0, count = 20) {
        const token = await this.getAccessToken();
        const postData = JSON.stringify({ offset, count });
        const url = `https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${token}`;
        return this._httpsPost(url, postData);
    }
    
    /**
     * 删除草稿
     */
    async deleteDraft(mediaId) {
        const token = await this.getAccessToken();
        const postData = JSON.stringify({ media_id: mediaId });
        const url = `https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=${token}`;
        return this._httpsPost(url, postData);
    }
    
    // 私有方法：HTTPS GET
    _httpsGet(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve({ raw: data });
                    }
                });
            }).on('error', reject);
        });
    }
    
    // 私有方法：HTTPS POST
    _httpsPost(url, postData) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve({ raw: data });
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }
}

module.exports = WechatAPI;