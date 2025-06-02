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
        version = "7ac02095";

        pname = repo;

        src = pkgs.fetchFromGitHub {
          inherit owner repo;
          rev = version;
          sha256 = "sha256-obobuO5Ih00itO27TLWyzCeftO1yzAs7pQs5wE71mKU=";
        };

        npmDepsHash = "sha256-nvSfA564MpXbSFTDi7XNmGZ2G+qndoI4rkiPelI4OOY=";
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
