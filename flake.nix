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
    version = "dc4ea24";

  in {
    packages = eachSystem ( { pkgs, system }: let
      src = pkgs.fetchFromGitHub {
        inherit owner repo;
        rev = version;
        sha256 = "sha256-7hCRHV1Xr6tBK85WPfwQ6ZNZnfxFXWic7bA1pIifRD4=";
      };
    in {
      deps = pkgs.fetchNpmDeps {
        inherit src;
        hash = "sha256-VPJpjNS/XhaoBAoWV5pkUSel1M/vrE9ogg1j7WxvUdw=";
      };
      default = pkgs.buildNpmPackage rec {
        inherit src version pname;

        npmDepsHash = "sha256-VPJpjNS/XhaoBAoWV5pkUSel1M/vrE9ogg1j7WxvUdw=";
        makeCacheWritable = true;
        npmFlags = [ "--omit=dev" "--omit=optional"];
        dontNpmBuild = true;

        postBuild = ''
          # Find the dependency dir robustly (handles hoisting/nesting)
          dep_dir=$(node -e "console.log(require.resolve('ssb-msgs/package.json').replace(/package\.json$/, '''))")

          echo "Patching $dep_dir"
          patch -p1 -d "$dep_dir" < ${./patches/ssb-msgs.patch}
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
