#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Configuration
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.next', '.git', 'coverage'];

// Packages to always ignore (typically used indirectly)
const ALWAYS_IGNORE = [
  '@types/*', // TypeScript type definitions
  'typescript',
  'eslint',
  'prettier',
  'husky',
  'lint-staged',
  'jest',
  'vitest',
  'webpack',
  'vite',
  'rollup',
  'esbuild',
];

function readPackageJson() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error('❌ package.json not found in current directory');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (EXTENSIONS.some((ext) => file.endsWith(ext))) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function extractImports(content) {
  const imports = new Set();

  // ES6 imports: import x from 'pkg' or import 'pkg'
  const es6Regex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

  // CommonJS require: require('pkg')
  const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  // Dynamic imports: import('pkg')
  const dynamicRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;
  while ((match = es6Regex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  while ((match = cjsRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }
  while ((match = dynamicRegex.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return imports;
}

function getPackageName(importPath) {
  // Handle scoped packages (@org/package)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.slice(0, 2).join('/');
  }
  // Handle regular packages (package or package/subpath)
  return importPath.split('/')[0];
}

function shouldIgnorePackage(pkg) {
  return ALWAYS_IGNORE.some((pattern) => {
    if (pattern.endsWith('*')) {
      return pkg.startsWith(pattern.slice(0, -1));
    }
    return pkg === pattern;
  });
}

function analyzeProject() {
  console.log('🔍 Analyzing project for unused packages...\n');

  const pkg = readPackageJson();
  const dependencies = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  if (Object.keys(dependencies).length === 0) {
    console.log('✅ No dependencies found in package.json');
    return;
  }

  console.log(`📦 Found ${Object.keys(dependencies).length} total packages`);

  const files = getAllFiles(process.cwd());
  console.log(`📄 Scanning ${files.length} files...\n`);

  const usedPackages = new Set();

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const imports = extractImports(content);

    imports.forEach((imp) => {
      const pkgName = getPackageName(imp);
      if (dependencies[pkgName]) {
        usedPackages.add(pkgName);
      }
    });
  });

  const allPackages = Object.keys(dependencies);
  const unused = allPackages.filter((pkg) => !usedPackages.has(pkg) && !shouldIgnorePackage(pkg));
  const ignored = allPackages.filter((pkg) => shouldIgnorePackage(pkg));

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`✅ Used packages: ${usedPackages.size}`);
  console.log(`⚠️  Potentially unused: ${unused.length}`);
  console.log(`🔧 Ignored (build tools/types): ${ignored.length}\n`);

  if (unused.length > 0) {
    console.log('❌ POTENTIALLY UNUSED PACKAGES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    unused.forEach((pkg) => {
      const version = dependencies[pkg];
      console.log(`  • ${pkg}@${version}`);
    });
    console.log('\n💡 To remove them, run:');
    console.log(`   npm uninstall ${unused.join(' ')}`);
    console.log(`   # or`);
    console.log(`   bun remove ${unused.join(' ')}`);
  } else {
    console.log('✨ No unused packages detected!');
  }

  if (ignored.length > 0) {
    console.log('\n🔧 IGNORED PACKAGES (likely used by build tools):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    ignored.forEach((pkg) => {
      console.log(`  • ${pkg}`);
    });
  }

  console.log('\n⚠️  NOTE: This is a static analysis. Some packages may be:');
  console.log('  • Used in config files (webpack, babel, etc.)');
  console.log('  • Peer dependencies or plugins');
  console.log('  • Used dynamically or in scripts');
  console.log('  • Required at runtime in production\n');
}

// Run the analyzer
try {
  analyzeProject();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
