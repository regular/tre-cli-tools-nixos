{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    systems = {
      url = "github:nix-systems/default";
    };
  };

  outputs = { self, systems, nixpkgs, ... }@inputs: let
    eachSystem = f: nixpkgs.lib.genAttrs (import systems) (system: f {
      inherit system;
      pkgs = nixpkgs.legacyPackages.${system};
    });

    owner = "regular";
    repo = "tre-cli";
    pname = repo;
    version = "a35cdea07ce53b578b418e7b7e215ca582093c32";

  in {
    packages = eachSystem ( { pkgs, system }: let
      src = pkgs.fetchFromGitHub {
        inherit owner repo;
        rev = version;
        sha256 = "sha256-B2Ohc9b/UZiZvFcpPA7Afjj5kriyeZvrhdP2c9kQU4o=";
      };
    in {
      deps = pkgs.fetchNpmDeps {
        inherit src;
      };
      default = pkgs.buildNpmPackage rec {
        inherit src version pname;

        npmDepsHash = "sha256-khP7j7tnc7NaHX7P/DX2Wz2ZDbpgMboYJ6oyCQ24FFw=";
        makeCacheWritable = true;
        npmFlags = [ "--omit=dev" "--omit=optional"];
        dontNpmBuild = true;

        postBuild = ''
          # Find the dependency dir robustly (handles hoisting/nesting)
          dep_dir=$(node -e "console.log(require.resolve('ssb-msgs/package.json').replace(/package\.json$/, '''))")
          echo "Patching $dep_dir"
          patch -p1 -d "$dep_dir" < ${./patches/ssb-msgs.patch}
          
          # Find the dependency dir robustly (handles hoisting/nesting)
          dep_dir=$(node -e "console.log(require.resolve('rc/package.json').replace(/package\.json$/, '''))")
          echo "Patching $dep_dir"
          patch -p1 -d "$dep_dir" < ${./patches/rc.patch}

          # Find the dependency dir robustly (handles hoisting/nesting)
          dep_dir=$(node -e "console.log(require.resolve('tre-cli-client/package.json').replace(/package\.json$/, '''))")
          echo "Patching $dep_dir"
          patch -p1 -d "$dep_dir" < ${./patches/tre-cli-client.patch}

          # Find the dependency dir robustly (handles hoisting/nesting)
          dep_dir=$(node -e "console.log(require.resolve('tre-boot/package.json').replace(/package\.json$/, '''))")
          echo "Patching $dep_dir"
          patch -p1 -d "$dep_dir" < ${./patches/tre-boot.patch}

          # Find the dependency dir robustly (handles hoisting/nesting)
          dep_dir=$(node -e "console.log(require.resolve('ssb-conn-hub/package.json').replace(/package\.json$/, '''))")
          echo "Patching $dep_dir"
          patch -p1 -d "$dep_dir" < ${./patches/ssb-conn-hub.patch}

          # Find the dependency dir robustly (handles hoisting/nesting)
          dep_dir=$(node -e "console.log(require.resolve('tre-cli-apps/package.json').replace(/package\.json$/, '''))")
          echo "Patching $dep_dir"
          patch -p1 -d "$dep_dir" < ${./patches/tre-cli-apps.patch}
        '';

        meta = {
          description = "Command-line tools for tre and treos (for developing ssb apps)";
          homepage = "https://github.com/${owner}/${repo}";
          license = pkgs.lib.licenses.mit;
          mainProgram = "tre";
          maintainers = [ "jan@lagomorph.de" ];
        };
      };
    });

    devShells = eachSystem ( { pkgs, system, ... }: {
      default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs
          self.packages.${system}.default
        ];
      };
    });
  };
}
