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
  in {
    packages = eachSystem ( { pkgs, system }: {
      default = pkgs.buildNpmPackage rec {
        owner = "regular";
        repo = "tre-cli";
        version = "ec0b3e4";

        pname = repo;

        src = pkgs.fetchFromGitHub {
          inherit owner repo;
          rev = version;
          sha256 = "sha256-tc0ODV8GVa9Ky/QmValQ2ce+YB/G5xpZ3aveZzjYtXM=";
        };

        npmDepsHash = "sha256-EgdJ9hY+KOprXVQ64wPtIjYoixCd2/b0EmH9j6qrpd0=";
        makeCacheWritable = true;
        npmFlags = [ "--omit=dev" "--omit=optional"];
        dontNpmBuild = true;

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
