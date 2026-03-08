#!/usr/bin/env node
/**
 * 微信公众号文章发布脚本
 * 
 * 功能：
 * 1. 获取Access Token
 * 2. 上传封面图
 * 3. 创建草稿
 * 4. 发布文章（如有权限）
 * 
 * 使用方法：
 * node publish.js --appid "xxx" --secret "xxx" --title "标题" --content "HTML内容" --author "作者" --digest "摘要" [--cover "封面图路径"]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 命令行参数解析
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            args[key] = value || true;
        }
    });
    return args;
}

// HTTPS GET请求
function httpsGet(url) {
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

// HTTPS POST请求
function httpsPost(url, postData, contentType = 'application/json') {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': contentType,
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

// 上传图片素材
function uploadImage(accessToken, imagePath) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(imagePath)) {
            reject(new Error('封面图文件不存在: ' + imagePath));
            return;
        }
        
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
            path: `/cgi-bin/material/add_material?access_token=${accessToken}&type=image`,
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

// 创建草稿
async function createDraft(accessToken, article) {
    const articles = Array.isArray(article) ? article : [article];
    const postData = JSON.stringify({ articles });
    const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;
    return httpsPost(url, postData);
}

// 发布文章
async function publishArticle(accessToken, mediaId) {
    const postData = JSON.stringify({ media_id: mediaId });
    const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${accessToken}`;
    return httpsPost(url, postData);
}

// 主函数
async function main() {
    const args = parseArgs();
    
    console.log('============================================================');
    console.log('📤 微信公众号文章发布');
    console.log('============================================================');
    
    // 检查必需参数
    const required = ['appid', 'secret', 'title', 'content'];
    const missing = required.filter(key => !args[key]);
    if (missing.length > 0) {
        console.error('❌ 缺少必需参数:', missing.join(', '));
        console.log('\n使用方法:');
        console.log('node publish.js --appid "xxx" --secret "xxx" --title "标题" --content "HTML内容" [--author "作者"] [--digest "摘要"] [--cover "封面图路径"]');
        process.exit(1);
    }
    
    try {
        // Step 1: 获取Access Token
        console.log('\n[1/4] 获取Access Token...');
        const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${args.appid}&secret=${args.secret}`;
        const tokenResult = await httpsGet(tokenUrl);
        
        if (!tokenResult.access_token) {
            throw new Error('获取Access Token失败: ' + JSON.stringify(tokenResult));
        }
        
        const accessToken = tokenResult.access_token;
        console.log('✅ Token:', accessToken.substring(0, 30) + '...');
        
        // Step 2: 处理封面图
        console.log('\n[2/4] 处理封面图...');
        let thumbMediaId = args.thumb_media_id;
        
        if (!thumbMediaId && args.cover) {
            console.log('   上传封面图...');
            const uploadResult = await uploadImage(accessToken, args.cover);
            if (uploadResult.media_id) {
                thumbMediaId = uploadResult.media_id;
                console.log('✅ 封面图上传成功');
                console.log('   Media ID:', thumbMediaId);
            } else {
                throw new Error('封面图上传失败: ' + JSON.stringify(uploadResult));
            }
        } else if (!thumbMediaId) {
            // 使用默认封面图（需要预先上传）
            console.log('⚠️ 未提供封面图，将使用默认封面');
            // 这里可以添加默认封面图逻辑
        }
        
        // Step 3: 创建草稿
        console.log('\n[3/4] 创建草稿...');
        const article = {
            title: args.title,
            author: args.author || '奥得赛投资研究',
            content: args.content,
            thumb_media_id: thumbMediaId,
            digest: args.digest || args.title,
            need_open_comment: args.need_open_comment !== '0' ? 1 : 0,
            only_fans_can_comment: args.only_fans_can_comment === '1' ? 1 : 0
        };
        
        const draftResult = await createDraft(accessToken, article);
        
        if (draftResult.media_id) {
            console.log('✅ 草稿创建成功');
            console.log('   Media ID:', draftResult.media_id);
        } else {
            throw new Error('创建草稿失败: ' + JSON.stringify(draftResult));
        }
        
        // Step 4: 发布文章
        console.log('\n[4/4] 发布文章...');
        const publishResult = await publishArticle(accessToken, draftResult.media_id);
        
        if (publishResult.errcode === 0) {
            console.log('✅ 文章发布成功！');
            console.log('   发布ID:', publishResult.publish_id);
        } else if (publishResult.errcode === 48001) {
            console.log('⚠️ API发布功能未授权（需认证服务号）');
            console.log('   草稿已保存，请登录后台手动发布');
            console.log('   https://mp.weixin.qq.com');
        } else if (publishResult.errcode) {
            console.log('⚠️ 发布结果:', JSON.stringify(publishResult));
            console.log('   草稿已保存，请登录后台查看');
        } else {
            console.log('✅ 文章发布成功！');
            console.log('   发布ID:', publishResult.publish_id);
        }
        
        console.log('\n============================================================');
        console.log('🎉 完成！');
        console.log('============================================================');
        
        // 返回结果
        return {
            success: true,
            draft_media_id: draftResult.media_id,
            publish_result: publishResult
        };
        
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        process.exit(1);
    }
}

// 导出函数供其他模块使用
module.exports = {
    httpsGet,
    httpsPost,
    uploadImage,
    createDraft,
    publishArticle,
    main
};

// 直接运行时执行主函数
if (require.main === module) {
    main();
}