// this file is a patch to fix the nanoid/non-secure module
// run "node fix-nanoid.js" to run

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// recursively find all nanoid/non-secure/package.json files
function findAllNanoidNonSecure(baseDir) {
  const results = [];
  
  function searchDir(dir, depth = 0) {
    if (!fs.existsSync(dir) || depth > 10) return; // prevent too deep recursion
    
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // if it is a nanoid/non-secure directory
            if (file === 'non-secure' && path.basename(dir) === 'nanoid') {
              const packageJsonPath = path.join(fullPath, 'package.json');
              if (fs.existsSync(packageJsonPath)) {
                results.push(fullPath);
              }
            } else if (file === 'node_modules' || file.startsWith('.') === false) {
              // continue searching in subdirectories, but avoid going into .git, .expo, etc.
              searchDir(fullPath, depth + 1);
            }
          }
        } catch (statError) {
          // ignore permission errors or other stat errors
          continue;
        }
      }
    } catch (readError) {
      // ignore permission errors
      return;
    }
  }
  
  // start searching from node_modules
  const nodeModulesDir = path.join(baseDir, 'node_modules');
  if (fs.existsSync(nodeModulesDir)) {
    searchDir(nodeModulesDir);
  }
  
  return results;
}

// fix the specific nanoid/non-secure directory
function fixNanoidNonSecure(nonSecureDir) {
  console.log(`fixing directory: ${nonSecureDir}`);
  
  try {
    // check the current package.json
    const packageJsonPath = path.join(nonSecureDir, 'package.json');
    let packageJson;
    
    if (fs.existsSync(packageJsonPath)) {
      // read the current content
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // check if index.js exists
      const indexJsPath = path.join(nonSecureDir, 'index.js');
      if (fs.existsSync(indexJsPath)) {
        // update the package.json config to ensure the package can be parsed correctly
        packageJson = {
          ...packageJson,
          main: "index.js", // change the main entry to index.js instead of index.cjs
          module: "index.js",
          // remove type: "module" if it exists, as it can cause issues with Metro
          ...(packageJson.type === "module" ? {} : { type: packageJson.type })
        };
        
        // remove the type field if it was "module"
        if (packageJson.type === "module") {
          delete packageJson.type;
        }
        
        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2)
        );
        console.log(`updated ${packageJsonPath} file, changed the main entry to index.js`);
        
        // copy index.js to index.cjs to ensure compatibility
        const indexContent = fs.readFileSync(indexJsPath, 'utf8');
        fs.writeFileSync(path.join(nonSecureDir, 'index.cjs'), indexContent);
        console.log(`copied ${indexJsPath} content to index.cjs to ensure compatibility`);
        
        return true;
      } else {
        console.error(`cannot find ${indexJsPath} file`);
        // if there is no index.js but there is nanoid/non-secure.js, try to copy
        const mainNanoidDir = path.join(__dirname, 'node_modules', 'nanoid');
        if (fs.existsSync(mainNanoidDir)) {
          const mainIndexPath = path.join(mainNanoidDir, 'non-secure', 'index.js');
          if (fs.existsSync(mainIndexPath)) {
            const indexContent = fs.readFileSync(mainIndexPath, 'utf8');
            fs.writeFileSync(path.join(nonSecureDir, 'index.js'), indexContent);
            fs.writeFileSync(path.join(nonSecureDir, 'index.cjs'), indexContent);
            console.log(`copied index.js from the main nanoid to ${nonSecureDir}`);
            
            // update package.json
            packageJson = {
              ...packageJson,
              main: "index.js",
              module: "index.js"
            };
            
            if (packageJson.type === "module") {
              delete packageJson.type;
            }
            
            fs.writeFileSync(
              packageJsonPath,
              JSON.stringify(packageJson, null, 2)
            );
            
            return true;
          }
        }
        return false;
      }
    } else {
      console.error(`cannot find ${packageJsonPath} file`);
      
      // try to create the directory and file
      const mainNanoidDir = path.join(__dirname, 'node_modules', 'nanoid');
      if (fs.existsSync(mainNanoidDir)) {
        const mainNonSecureDir = path.join(mainNanoidDir, 'non-secure');
        if (fs.existsSync(mainNonSecureDir)) {
          // ensure the directory exists
          if (!fs.existsSync(path.dirname(packageJsonPath))) {
            fs.mkdirSync(path.dirname(packageJsonPath), { recursive: true });
          }
          
          // create the package.json
          const newPackageJson = {
            "main": "index.js",
            "module": "index.js"
          };
          fs.writeFileSync(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
          console.log(`created ${packageJsonPath} file`);
          
          // copy index.js
          const mainIndexPath = path.join(mainNonSecureDir, 'index.js');
          if (fs.existsSync(mainIndexPath)) {
            const indexContent = fs.readFileSync(mainIndexPath, 'utf8');
            fs.writeFileSync(path.join(nonSecureDir, 'index.js'), indexContent);
            fs.writeFileSync(path.join(nonSecureDir, 'index.cjs'), indexContent);
            console.log(`copied index.js from the main nanoid to ${nonSecureDir}`);
            return true;
          }
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error(`error during fixing (${nonSecureDir}):`, error);
    return false;
  }
}

// create a manual mapping file to ensure nanoid/non-secure is parsed correctly
function createNonSecureResolver() {
  // create a node_modules/nanoid-non-secure package
  const helperDir = path.join(__dirname, 'node_modules', 'nanoid-non-secure');
  if (!fs.existsSync(helperDir)) {
    fs.mkdirSync(helperDir, { recursive: true });
  }
  
  // copy the non-secure code from the main nanoid package
  const mainNonSecurePath = path.join(__dirname, 'node_modules', 'nanoid', 'non-secure', 'index.js');
  if (fs.existsSync(mainNonSecurePath)) {
    const content = fs.readFileSync(mainNonSecurePath, 'utf8');
    
    // create the package.json
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
    
    // create index.js
    fs.writeFileSync(path.join(helperDir, 'index.js'), content);
    
    console.log('created nanoid-non-secure helper package');
    
    return true;
  }
  
  return false;
}

// main function
function main() {
  // create the helper resolver
  createNonSecureResolver();
  
  // find all nanoid/non-secure directories
  const nonSecureDirs = findAllNanoidNonSecure(__dirname);
  
  console.log(`found ${nonSecureDirs.length} nanoid/non-secure directories to fix`);
  
  let successCount = 0;
  
  // fix each directory
  for (const dir of nonSecureDirs) {
    if (fixNanoidNonSecure(dir)) {
      successCount++;
    }
  }
  
  console.log(`successfully fixed ${successCount}/${nonSecureDirs.length} nanoid/non-secure modules`);
  
  // if you need a more thorough fix, you can try to clean the metro cache
  try {
    console.log('cleaning Metro cache...');
    execSync('npx react-native start --reset-cache', { stdio: 'ignore' });
  } catch (error) {
    // ignore the error, this is an optional step
  }
}

main(); 