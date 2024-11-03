// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Importaciones necesarias
import "@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@oasisprotocol/sapphire-contracts/contracts/Subcall.sol";

/**
 * @dev Contract deployed on Sapphire Testnet
 * @notice You can view the deployed contract at:
 * https://explorer.oasis.io/testnet/sapphire/address/0xEdDa5130fD503445AB7c4520DA7ef1b55Be0372A
*/

contract VaultOracle is Ownable {
    // Estructura para almacenar datos de cada cadena
    struct ChainData {
        uint256 totalSupply;
        address tokenContract;
        bool isActive;
    }
    
    // Mapeo de chainId a ChainData
    mapping(uint256 => ChainData) public chainSupplies; // chainId => ChainData

    // Lista de cadenas soportadas
    uint256[] public supportedChains;

    // Balance del banco
    uint256 public bankBalance;

    // App ID de ROFL
    bytes21 public roflAppID;

    // Eventos
    event VaultDataUpdated(uint256 chainId, uint256 totalSupply, uint256 bankBalance);
    event RoflAppIDUpdated(bytes21 newRoflAppID);
    event ChainAdded(uint256 chainId, address tokenContract);
    event ChainRemoved(uint256 chainId);

    // Modificador para restringir funciones al Oracle ROFL
    modifier onlyRoflOracle() {
        Subcall.roflEnsureAuthorizedOrigin(roflAppID);
        _;
    }

    // Constructor
    constructor(bytes21 _roflAppID) Ownable(msg.sender) {
        require(_roflAppID != bytes21(0), "App ID invalido");
        roflAppID = _roflAppID;
    }

    // Función para actualizar el App ID de ROFL
    function setRoflAppID(bytes21 _roflAppID) external onlyOwner {
        require(_roflAppID != bytes21(0), "App ID invalido");
        roflAppID = _roflAppID;
        emit RoflAppIDUpdated(_roflAppID);
    }

    // Función para añadir una nueva cadena
    function addChain(uint256 chainId, address tokenContract) external onlyOwner {
        require(!chainSupplies[chainId].isActive, "Cadena ya existe");
        require(tokenContract != address(0), "Contrato de token invalido");

        chainSupplies[chainId] = ChainData({
            totalSupply: 0,
            tokenContract: tokenContract,
            isActive: true
        });
        supportedChains.push(chainId);
        emit ChainAdded(chainId, tokenContract);
    }

    // Función para remover una cadena
    function removeChain(uint256 chainId) external onlyOwner {
        require(chainSupplies[chainId].isActive, "Cadena no esta activa");

        chainSupplies[chainId].isActive = false;

        // Eliminar de supportedChains
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (supportedChains[i] == chainId) {
                supportedChains[i] = supportedChains[supportedChains.length - 1];
                supportedChains.pop();
                break;
            }
        }

        emit ChainRemoved(chainId);
    }

    // Función para actualizar los datos del Vault
    function updateVaultData(
        uint256 chainId,
        uint256 _totalSupply,
        uint256 _bankBalance
    ) external onlyRoflOracle {
        require(chainSupplies[chainId].isActive, "Cadena no activa");
        
        // Actualizar los datos de la cadena
        chainSupplies[chainId].totalSupply = _totalSupply;
        
        // Actualizar el balance del banco
        bankBalance = _bankBalance;
        
        emit VaultDataUpdated(chainId, _totalSupply, _bankBalance);
    }

    // Función para obtener los datos del Vault
    function getVaultData() external view returns (uint256 totalSupplyAllChains, uint256 currentBankBalance) {
        totalSupplyAllChains = 0;
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (chainSupplies[supportedChains[i]].isActive) {
                totalSupplyAllChains += chainSupplies[supportedChains[i]].totalSupply;
            }
        }
        currentBankBalance = bankBalance;
    }

    // Función para obtener los datos de una cadena específica
    function getChainData(uint256 chainId) external view returns (
        uint256 supply,
        address tokenContract,
        bool isActive
    ) {
        ChainData memory data = chainSupplies[chainId];
        return (
            data.totalSupply,
            data.tokenContract,
            data.isActive
        );
    }

    // Función para obtener todas las cadenas soportadas
    function getSupportedChains() external view returns (uint256[] memory) {
        return supportedChains;
    }

    // Función para obtener las cadenas activas
    function getActiveChains() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (chainSupplies[supportedChains[i]].isActive) {
                activeCount++;
            }
        }

        uint256[] memory activeChains = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < supportedChains.length; i++) {
            if (chainSupplies[supportedChains[i]].isActive) {
                activeChains[index] = supportedChains[i];
                index++;
            }
        }
        return activeChains;
    }
}