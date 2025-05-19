// 这个文件是一个修复 nanoid/non-secure 模块的补丁
// 使用 "node fix-nanoid.js" 命令运行

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 递归查找所有 nanoid/non-secure/package.json 文件
function findAllNanoidNonSecure(baseDir) {
  const results = [];
  
  function searchDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // 如果是 nanoid/non-secure 目录
        if (file === 'non-secure' && path.basename(dir) === 'nanoid') {
          const packageJsonPath = path.join(fullPath, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            results.push(fullPath);
          }
        } else if (file !== 'node_modules') {
          // 避免无限递归
          searchDir(fullPath);
        }
      }
    }
  }
  
  // 查找所有可能存在 nanoid 的目录
  const possibleDirs = [
    path.join(baseDir, 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'core', 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'native', 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'stack', 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'drawer', 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'bottom-tabs', 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'routers', 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'elements', 'node_modules', 'nanoid', 'non-secure'),
    path.join(baseDir, 'node_modules', '@react-navigation', 'material-top-tabs', 'node_modules', 'nanoid', 'non-secure')
  ];
  
  // 检查明确的目录
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      const packageJsonPath = path.join(dir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        results.push(dir);
      }
    }
  }
  
  return results;
}

// 修复特定的 nanoid/non-secure 目录
function fixNanoidNonSecure(nonSecureDir) {
  console.log(`修复目录: ${nonSecureDir}`);
  
  try {
    // 检查当前 package.json
    const packageJsonPath = path.join(nonSecureDir, 'package.json');
    let packageJson;
    
    if (fs.existsSync(packageJsonPath)) {
      // 读取当前内容
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 检查 index.js 是否存在
      const indexJsPath = path.join(nonSecureDir, 'index.js');
      if (fs.existsSync(indexJsPath)) {
        // 更新 package.json 配置，确保包可以被正确解析
        packageJson = {
          ...packageJson,
          main: "index.js" // 将主入口指向 index.js 而不是 index.cjs
        };
        
        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2)
        );
        console.log(`已更新 ${packageJsonPath} 文件，将主入口改为 index.js`);
        
        // 复制 index.js 到 index.cjs 以确保兼容性
        const indexContent = fs.readFileSync(indexJsPath, 'utf8');
        fs.writeFileSync(path.join(nonSecureDir, 'index.cjs'), indexContent);
        console.log(`已将 ${indexJsPath} 内容复制到 index.cjs 以确保兼容性`);
        
        return true;
      } else {
        console.error(`无法找到 ${indexJsPath} 文件`);
        // 如果没有 index.js 但有 nanoid/non-secure.js，尝试复制
        const mainNanoidDir = path.join(__dirname, 'node_modules', 'nanoid');
        if (fs.existsSync(mainNanoidDir)) {
          const mainIndexPath = path.join(mainNanoidDir, 'non-secure', 'index.js');
          if (fs.existsSync(mainIndexPath)) {
            const indexContent = fs.readFileSync(mainIndexPath, 'utf8');
            fs.writeFileSync(path.join(nonSecureDir, 'index.js'), indexContent);
            fs.writeFileSync(path.join(nonSecureDir, 'index.cjs'), indexContent);
            console.log(`已从主 nanoid 复制 index.js 到 ${nonSecureDir}`);
            return true;
          }
        }
        return false;
      }
    } else {
      console.error(`无法找到 ${packageJsonPath} 文件`);
      
      // 尝试创建目录和文件
      const mainNanoidDir = path.join(__dirname, 'node_modules', 'nanoid');
      if (fs.existsSync(mainNanoidDir)) {
        const mainNonSecureDir = path.join(mainNanoidDir, 'non-secure');
        if (fs.existsSync(mainNonSecureDir)) {
          // 确保目录存在
          if (!fs.existsSync(path.dirname(packageJsonPath))) {
            fs.mkdirSync(path.dirname(packageJsonPath), { recursive: true });
          }
          
          // 创建 package.json
          const newPackageJson = {
            "main": "index.js",
            "module": "index.js"
          };
          fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
          console.log(`已创建 ${packageJsonPath} 文件`);
          
          // 复制 index.js
          const mainIndexPath = path.join(mainNonSecureDir, 'index.js');
          if (fs.existsSync(mainIndexPath)) {
            const indexContent = fs.readFileSync(mainIndexPath, 'utf8');
            fs.writeFileSync(path.join(nonSecureDir, 'index.js'), indexContent);
            fs.writeFileSync(path.join(nonSecureDir, 'index.cjs'), indexContent);
            console.log(`已从主 nanoid 复制 index.js 到 ${nonSecureDir}`);
            return true;
          }
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error(`修复过程中出错 (${nonSecureDir}):`, error);
    return false;
  }
}

// 创建手动的映射文件，确保 nanoid/non-secure 被正确解析
function createNonSecureResolver() {
  // 创建一个 node_modules/nanoid-non-secure 包
  const helperDir = path.join(__dirname, 'node_modules', 'nanoid-non-secure');
  if (!fs.existsSync(helperDir)) {
    fs.mkdirSync(helperDir, { recursive: true });
  }
  
  // 从主 nanoid 包复制非安全代码
  const mainNonSecurePath = path.join(__dirname, 'node_modules', 'nanoid', 'non-secure', 'index.js');
  if (fs.existsSync(mainNonSecurePath)) {
    const content = fs.readFileSync(mainNonSecurePath, 'utf8');
    
    // 创建 package.json
    const packageJson = {
      "name": "nanoid-non-secure",
      "version": "1.0.0",
      "main": "index.js",
      "module": "index.js"
    };
    
    fs.writeFileSync(
      path.join(helperDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // 创建 index.js
    fs.writeFileSync(path.join(helperDir, 'index.js'), content);
    
    console.log('已创建 nanoid-non-secure 辅助包');
    
    return true;
  }
  
  return false;
}

// 主函数
function main() {
  // 创建辅助解析器
  createNonSecureResolver();
  
  // 查找所有 nanoid/non-secure 目录
  const nonSecureDirs = findAllNanoidNonSecure(__dirname);
  
  console.log(`找到 ${nonSecureDirs.length} 个 nanoid/non-secure 目录需要修复`);
  
  let successCount = 0;
  
  // 修复每个目录
  for (const dir of nonSecureDirs) {
    if (fixNanoidNonSecure(dir)) {
      successCount++;
    }
  }
  
  console.log(`成功修复 ${successCount}/${nonSecureDirs.length} 个 nanoid/non-secure 模块`);
  
  // 如果需要更彻底的修复，可以尝试 metro 缓存清理
  try {
    console.log('清理 Metro 缓存...');
    execSync('npx react-native start --reset-cache', { stdio: 'ignore' });
  } catch (error) {
    // 忽略错误，因为这只是可选的步骤
  }
}

main(); 